const ORIGIN_HOST = "www.sales.apokolips.xyz";
const ASSET_PREFIX = "/assets/sales/";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function config(env) {
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = String(env.SUPABASE_PUBLISHABLE_KEY || "");
  const origin = new URL(env.ORIGIN_BASE || "https://" + ORIGIN_HOST);
  if (!supabaseUrl.startsWith("https://") || !key || origin.protocol !== "https:" || origin.hostname !== ORIGIN_HOST) {
    throw new Error("The domain router is not configured with its Supabase public key and approved static origin.");
  }
  return { supabaseUrl, key, origin };
}

async function activeDomainWebsite(hostname, configValue, fetcher) {
  const url = new URL(configValue.supabaseUrl + "/rest/v1/builder_domains");
  url.searchParams.set("select", "website_id");
  url.searchParams.set("domain", "eq." + hostname);
  url.searchParams.set("status", "eq.active");
  url.searchParams.set("limit", "1");

  const response = await fetcher(url.toString(), {
    method: "GET",
    headers: {
      apikey: configValue.key,
      accept: "application/json"
    },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error("The Apokolips domain registry could not be reached.");
  const rows = await response.json();
  return Array.isArray(rows) && rows[0]?.website_id ? rows[0].website_id : null;
}

function originRequestUrl(pathname, search, origin) {
  const target = new URL(pathname + search, origin);
  if (target.hostname !== ORIGIN_HOST || target.protocol !== "https:") {
    throw new Error("Blocked an unexpected static origin.");
  }
  return target;
}

async function proxyStaticAsset(request, requestUrl, configValue, fetcher) {
  const target = originRequestUrl(requestUrl.pathname, requestUrl.search, configValue.origin);
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const range = request.headers.get("range");
  if (accept) headers.set("accept", accept);
  if (range) headers.set("range", range);

  const upstream = await fetcher(target.toString(), {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(12000)
  });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("x-content-type-options", "nosniff");
  responseHeaders.set("cache-control", "public, max-age=300");
  responseHeaders.delete("set-cookie");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

async function serveSalesApp(request, requestUrl, configValue, fetcher) {
  const target = originRequestUrl("/sales.html", "", configValue.origin);
  const upstream = await fetcher(target.toString(), {
    method: request.method,
    headers: { accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(12000)
  });
  const headers = new Headers(upstream.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.delete("set-cookie");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

export async function handleRequest(request, env, fetcher = globalThis.fetch) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method_not_allowed" }, 405);
  }

  let configValue;
  try {
    configValue = config(env);
  } catch {
    return json({ error: "router_not_configured" }, 503);
  }

  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.toLowerCase().replace(/\.$/, "");

  // Static bundles are public and shared by every published Apokolips website.
  if (requestUrl.pathname.startsWith(ASSET_PREFIX)) {
    try {
      return await proxyStaticAsset(request, requestUrl, configValue, fetcher);
    } catch {
      return json({ error: "asset_origin_unavailable" }, 502);
    }
  }

  if (requestUrl.pathname === "/__apokolips-router-health") {
    return json({ ok: true, service: "apokolips-domain-router" });
  }

  if (!hostname || hostname === ORIGIN_HOST || hostname.length > 253) {
    return json({ error: "invalid_hostname" }, 400);
  }

  let websiteId;
  try {
    websiteId = await activeDomainWebsite(hostname, configValue, fetcher);
  } catch {
    return json({ error: "domain_registry_unavailable" }, 503);
  }
  if (!websiteId) {
    return new Response("This domain is not connected to an active Apokolips website.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }

  try {
    return await serveSalesApp(request, requestUrl, configValue, fetcher);
  } catch {
    return json({ error: "static_origin_unavailable" }, 502);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
