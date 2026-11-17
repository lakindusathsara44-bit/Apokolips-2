import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

function readSecretObject(name: string): Record<string, string> {
  try {
    const value = Deno.env.get(name);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function getRuntimeConfig() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")
    || readSecretObject("SUPABASE_PUBLISHABLE_KEYS").default
    || "";
  const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || readSecretObject("SUPABASE_SECRET_KEYS").default
    || "";
  if (!url || !publishableKey || !secretKey) throw new Error("Supabase function keys are not configured.");
  return { url, publishableKey, secretKey };
}

function decodeTxtAnswer(value: string): string {
  const pieces = value.match(/"[^"]*"/g);
  if (pieces?.length) return pieces.map(piece => piece.slice(1, -1)).join("").trim();
  return value.replace(/^"|"$/g, "").trim();
}

async function findExpectedTxtRecord(name: string, expected: string): Promise<boolean> {
  const url = new URL("https://dns.google/resolve");
  url.searchParams.set("name", name);
  url.searchParams.set("type", "TXT");
  const response = await fetch(url, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error("The public DNS resolver is temporarily unavailable.");
  const payload = await response.json();
  if (payload.Status !== 0) return false;
  return (payload.Answer || []).some((answer: { type?: number; data?: string }) =>
    answer.type === 16 && decodeTxtAnswer(String(answer.data || "")) === expected
  );
}

function parseCloudflareResponse(payload: any) {
  if (!payload?.success || !payload?.result) {
    const detail = (payload?.errors || []).map((item: any) => item.message).filter(Boolean).join("; ");
    throw new Error(detail || "Cloudflare rejected the hostname operation.");
  }
  return payload.result;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authorization = request.headers.get("Authorization") || "";
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return json({ error: "authentication_required" }, 401);

    const { url, publishableKey, secretKey } = getRuntimeConfig();
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: "Bearer " + bearer } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userResult, error: userError } = await userClient.auth.getUser();
    if (userError || !userResult.user) return json({ error: "invalid_session" }, 401);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const domainId = String(body.domainId || "");
    if (!domainId || domainId.length > 80) return json({ error: "domain_id_required" }, 400);
    if (!["verify", "provision", "refresh", "remove"].includes(action)) return json({ error: "unsupported_action" }, 400);

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: domain, error: domainError } = await admin.from("builder_domains")
      .select("id,workspace_id,website_id,domain,domain_type,status,verification_token,verified_at,cloudflare_hostname_id,cloudflare_validation_records,cname_target")
      .eq("id", domainId).maybeSingle();
    if (domainError) throw domainError;
    if (!domain) return json({ error: "domain_not_found" }, 404);

    const { data: membership, error: membershipError } = await admin.from("builder_workspace_members")
      .select("role").eq("workspace_id", domain.workspace_id)
      .eq("user_id", userResult.user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership || !["owner", "editor"].includes(membership.role)) {
      return json({ error: "domain_management_forbidden" }, 403);
    }

    if (action === "remove") {
      if (domain.cloudflare_hostname_id) {
        const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
        const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
        if (!apiToken || !zoneId) {
          return json({
            error: "cloudflare_not_configured",
            status: domain.status,
            message: "This domain already has a Cloudflare hostname. Configure the Cloudflare API token and zone ID before removing it so Apokolips can clean up the provider resource safely."
          }, 503);
        }
        const deleteResponse = await fetch(
          "https://api.cloudflare.com/client/v4/zones/" + encodeURIComponent(zoneId) + "/custom_hostnames/" + encodeURIComponent(domain.cloudflare_hostname_id),
          {
            method: "DELETE",
            headers: { Authorization: "Bearer " + apiToken, Accept: "application/json" },
            signal: AbortSignal.timeout(12000)
          }
        );
        const deletePayload = await deleteResponse.json().catch(() => ({}));
        if (deleteResponse.status !== 404 && (!deleteResponse.ok || deletePayload?.success === false)) {
          const details = (deletePayload?.errors || []).map((item: any) => item.message).filter(Boolean).join("; ");
          throw new Error(details || "Cloudflare could not remove the custom hostname. The Apokolips domain record was kept.");
        }
      }

      const { error: deleteError } = await admin.from("builder_domains").delete().eq("id", domain.id);
      if (deleteError) throw deleteError;
      return json({
        ok: true,
        status: "removed",
        message: "The domain request and any provisioned Cloudflare hostname were removed. Remove the TXT/CNAME records from the customer's DNS provider separately."
      });
    }

    if (action === "verify") {
      if (["verified", "provisioning", "active"].includes(domain.status)) {
        return json({ ok: true, status: domain.status, message: "DNS ownership has already been verified." });
      }
      if (domain.status !== "pending_setup") return json({ error: "domain_not_verifiable", status: domain.status }, 409);

      if (domain.domain_type === "apokolips_subdomain") {
        if (Deno.env.get("APOKOLIPS_WILDCARD_ROUTING_READY") !== "true") {
          return json({
            error: "platform_routing_not_ready",
            status: "pending_setup",
            message: "Apokolips wildcard DNS and the domain router must be configured before platform subdomains can be verified."
          }, 503);
        }
        const now = new Date().toISOString();
        const { error: updateError } = await admin.from("builder_domains")
          .update({ status: "verified", verified_at: now })
          .eq("id", domain.id).eq("status", "pending_setup");
        if (updateError) throw updateError;
        return json({ ok: true, status: "verified", verifiedAt: now, message: "Apokolips platform routing is ready; this subdomain is verified." });
      }

      const txtName = "_apokolips-verify." + domain.domain;
      if (!await findExpectedTxtRecord(txtName, domain.verification_token)) {
        return json({
          error: "verification_record_not_found", status: "pending_setup", txtName,
          message: "The expected TXT value was not found at " + txtName + ". DNS changes can take time to propagate."
        }, 409);
      }

      const now = new Date().toISOString();
      const { error: updateError } = await admin.from("builder_domains")
        .update({ status: "verified", verified_at: now })
        .eq("id", domain.id).eq("status", "pending_setup");
      if (updateError) throw updateError;
      return json({ ok: true, status: "verified", verifiedAt: now, message: "DNS ownership verified." });
    }

    if (action === "provision") {
      if (!["verified", "provisioning", "active"].includes(domain.status)) {
        return json({ error: "verify_domain_first", status: domain.status }, 409);
      }
      if (domain.status === "active") {
        return json({ ok: true, status: "active", cnameTarget: domain.cname_target, message: "This hostname is already active." });
      }

      if (domain.domain_type === "apokolips_subdomain") {
        if (Deno.env.get("APOKOLIPS_WILDCARD_ROUTING_READY") !== "true") {
          return json({
            error: "platform_routing_not_ready", status: domain.status,
            message: "Apokolips wildcard DNS and the domain router must be configured before platform subdomains can go live."
          }, 503);
        }
        const { data: updated, error: updateError } = await admin.from("builder_domains")
          .update({ status: "active", cname_target: null }).eq("id", domain.id)
          .select("status").single();
        if (updateError) throw updateError;
        return json({ ok: true, status: updated.status, message: "Apokolips subdomain activated." });
      }

      const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
      const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
      const cnameTarget = Deno.env.get("CLOUDFLARE_CNAME_TARGET") || "";
      if (!apiToken || !zoneId || !cnameTarget) {
        return json({
          error: "cloudflare_not_configured", status: domain.status,
          message: "Cloudflare for SaaS is not connected yet. The platform administrator must configure the API token, zone ID, fallback origin, and CNAME target."
        }, 503);
      }

      let hostnameResult: any;
      if (domain.cloudflare_hostname_id) {
        const existingResponse = await fetch(
          "https://api.cloudflare.com/client/v4/zones/" + encodeURIComponent(zoneId) + "/custom_hostnames/" + encodeURIComponent(domain.cloudflare_hostname_id),
          { headers: { Authorization: "Bearer " + apiToken, Accept: "application/json" }, signal: AbortSignal.timeout(12000) }
        );
        hostnameResult = parseCloudflareResponse(await existingResponse.json());
      } else {
        const createResponse = await fetch(
          "https://api.cloudflare.com/client/v4/zones/" + encodeURIComponent(zoneId) + "/custom_hostnames",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + apiToken, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              hostname: domain.domain,
              ssl: {
                method: "txt", type: "dv", bundle_method: "ubiquitous",
                settings: { http2: "on", min_tls_version: "1.2", tls_1_3: "on" }
              }
            }),
            signal: AbortSignal.timeout(15000)
          }
        );
        hostnameResult = parseCloudflareResponse(await createResponse.json());
      }

      const validationRecords = Array.isArray(hostnameResult.ssl?.validation_records) ? hostnameResult.ssl.validation_records : [];
      const hostnameStatus = String(hostnameResult.status || "pending");
      const sslStatus = String(hostnameResult.ssl?.status || "pending_validation");
      const routerReady = Deno.env.get("APOKOLIPS_WILDCARD_ROUTING_READY") === "true";
      const activated = hostnameStatus === "active" && sslStatus === "active" && routerReady;
      const { error: updateError } = await admin.from("builder_domains").update({
        status: activated ? "active" : "provisioning",
        cloudflare_hostname_id: hostnameResult.id || domain.cloudflare_hostname_id,
        cloudflare_hostname_status: hostnameStatus,
        cloudflare_ssl_status: sslStatus,
        cloudflare_validation_records: validationRecords,
        cloudflare_ownership_verification: hostnameResult.ownership_verification || null,
        cname_target: cnameTarget,
        last_cloudflare_check_at: new Date().toISOString()
      }).eq("id", domain.id);
      if (updateError) throw updateError;

      return json({
        ok: true, status: activated ? "active" : "provisioning", hostnameStatus, sslStatus, cnameTarget,
        validationRecords, ownershipVerification: hostnameResult.ownership_verification || null,
        message: activated
          ? "Cloudflare confirms the hostname, SSL certificate and Apokolips router are active."
          : hostnameStatus === "active" && sslStatus === "active"
            ? "Cloudflare has issued the certificate, but Apokolips hostname routing is not enabled yet."
            : "Cloudflare is provisioning the hostname. Add the displayed DNS records, then check status again."
      });
    }

    if (!domain.cloudflare_hostname_id) {
      if (domain.domain_type === "apokolips_subdomain" && Deno.env.get("APOKOLIPS_WILDCARD_ROUTING_READY") === "true") {
        const { error: updateError } = await admin.from("builder_domains")
          .update({ status: "active", last_cloudflare_check_at: new Date().toISOString() }).eq("id", domain.id);
        if (updateError) throw updateError;
        return json({ ok: true, status: "active", message: "Apokolips wildcard routing is active." });
      }
      return json({ error: "hostname_not_provisioned", status: domain.status }, 409);
    }

    const refreshToken = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
    const refreshZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID") || "";
    if (!refreshToken || !refreshZoneId) {
      return json({ error: "cloudflare_not_configured", status: domain.status, message: "Cloudflare credentials are not configured on the Apokolips platform." }, 503);
    }
    const refreshResponse = await fetch(
      "https://api.cloudflare.com/client/v4/zones/" + encodeURIComponent(refreshZoneId) + "/custom_hostnames/" + encodeURIComponent(domain.cloudflare_hostname_id),
      { headers: { Authorization: "Bearer " + refreshToken, Accept: "application/json" }, signal: AbortSignal.timeout(12000) }
    );
    const refreshed = parseCloudflareResponse(await refreshResponse.json());
    const hostnameStatus = String(refreshed.status || "pending");
    const sslStatus = String(refreshed.ssl?.status || "pending_validation");
    const validationRecords = Array.isArray(refreshed.ssl?.validation_records) ? refreshed.ssl.validation_records : (domain.cloudflare_validation_records || []);
    const routerReady = Deno.env.get("APOKOLIPS_WILDCARD_ROUTING_READY") === "true";
    const activated = hostnameStatus === "active" && sslStatus === "active" && routerReady;
    const { error: updateError } = await admin.from("builder_domains").update({
      status: activated ? "active" : "provisioning",
      cloudflare_hostname_status: hostnameStatus,
      cloudflare_ssl_status: sslStatus,
      cloudflare_validation_records: validationRecords,
      cloudflare_ownership_verification: refreshed.ownership_verification || null,
      last_cloudflare_check_at: new Date().toISOString()
    }).eq("id", domain.id);
    if (updateError) throw updateError;

    return json({
      ok: true, status: activated ? "active" : "provisioning", hostnameStatus, sslStatus,
      cnameTarget: domain.cname_target, validationRecords,
      ownershipVerification: refreshed.ownership_verification || null,
      message: activated
        ? "Cloudflare confirms the hostname, SSL certificate and Apokolips router are active."
        : hostnameStatus === "active" && sslStatus === "active"
          ? "Cloudflare has issued the certificate, but Apokolips hostname routing is not enabled yet."
          : "The hostname is still provisioning. Complete the requested DNS changes and try again."
    });
  } catch (error) {
    console.error("domain-control failed:", error);
    return json({ error: "domain_control_failed", message: error instanceof Error ? error.message : "Domain operation failed." }, 500);
  }
});
