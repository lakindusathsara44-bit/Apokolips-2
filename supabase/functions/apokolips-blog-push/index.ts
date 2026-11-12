import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const ALLOWED_ORIGINS = new Set([
  "https://www.apokolips.xyz",
  "https://lakindusathsara44-bit.github.io",
]);

const corsHeadersFor = (req: Request) => {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://www.apokolips.xyz",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-blog-webhook-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeadersFor(req) });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("APOKOLIPS_BLOG_WEBHOOK_SECRET")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "https://www.apokolips.xyz";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });

  if (req.method === "GET") {
    if (!VAPID_PUBLIC_KEY) return json(req, { error: "Push notifications are not configured yet." }, 503);
    return json(req, { publicKey: VAPID_PUBLIC_KEY });
  }

  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);
  if (!WEBHOOK_SECRET || req.headers.get("x-blog-webhook-secret") !== WEBHOOK_SECRET) {
    return json(req, { error: "Unauthorized webhook." }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON payload." }, 400);
  }

  // GitHub Actions calls this only when a new image is referenced by blog.html.
  if (payload.event === "media_added") {
    const filePath = String(payload.file_path || "");
    const allowedRawUrl = /^https:\/\/raw\.githubusercontent\.com\/lakindusathsara44-bit\/Apokolips\/[\w./% -]+\.(jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(filePath);
    const allowedRelativePath = /^[\w./% -]{1,500}\.(jpe?g|png|webp|gif)$/i.test(filePath);
    if ((!allowedRawUrl && !allowedRelativePath) || filePath.includes("..")) {
      return json(req, { error: "Invalid blog photo reference." }, 400);
    }
    const { error } = await admin.from("apokolips_blog_media_events")
      .upsert({ file_path: filePath }, { onConflict: "file_path", ignoreDuplicates: true });
    if (error) return json(req, { error: error.message }, 500);
    return json(req, { ok: true, event: "media_added" });
  }

  // Supabase Database Webhook calls this after a notification row is inserted.
  if (payload.table !== "apokolips_blog_notifications" || payload.type !== "INSERT") {
    return json(req, { ignored: true });
  }

  const record = payload.record as {
    id: string;
    recipient_visitor_id: string;
    title: string;
    body: string;
    target_url: string;
  } | undefined;

  if (!record?.recipient_visitor_id) return json(req, { error: "Missing notification record." }, 400);
  if (!SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json(req, { error: "Push secrets are not configured." }, 503);
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const { data: subscriptions, error } = await admin
    .from("apokolips_blog_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("visitor_id", record.recipient_visitor_id);

  if (error) return json(req, { error: error.message }, 500);
  const results = await Promise.all((subscriptions || []).map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify({
        title: record.title,
        body: record.body,
        url: record.target_url,
        notificationId: record.id,
      }));
      return { id: subscription.id, sent: true };
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("apokolips_blog_push_subscriptions").delete().eq("id", subscription.id);
      }
      return { id: subscription.id, sent: false, statusCode };
    }
  }));

  return json(req, { ok: true, sent: results.filter((item) => item.sent).length, results });
});
