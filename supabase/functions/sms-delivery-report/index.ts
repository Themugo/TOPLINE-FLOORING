import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, headerOrQuery } from "../_shared/security.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const callbackSecret = Deno.env.get("AT_DLR_SECRET");
if (!supabaseUrl || !serviceRoleKey || !callbackSecret) throw new Error("SMS delivery callback is not configured");
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession:false, autoRefreshToken:false } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status:405 });
  if (!constantTimeEqual(headerOrQuery(req, "x-topline-callback-secret", "secret"), callbackSecret)) return new Response("Unauthorized", { status:401 });
  const raw = await req.text();
  if (raw.length > 65_536) return new Response("Payload Too Large", { status:413 });
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  let payload: Record<string, string> = {};
  if (contentType.includes("application/json")) {
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return Response.json({ error:"Invalid JSON payload" }, { status:400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error:"Invalid callback payload" }, { status:400 });
    payload = Object.fromEntries(Object.entries(body).map(([k,v]) => [k,String(v ?? "")]));
  } else if (contentType.includes("multipart/form-data")) {
    const formRequest = new Request(req.url, { method:"POST", headers:req.headers, body:raw });
    const form = await formRequest.formData().catch(() => null);
    if (!form) return Response.json({ error:"Invalid form callback payload" }, { status:400 });
    for (const [k,v] of form.entries()) payload[k] = String(v);
  } else {
    for (const [k,v] of new URLSearchParams(raw).entries()) payload[k] = v;
  }
  const messageId = payload.id || payload.messageId || payload.message_id || "";
  if (!messageId) return new Response("Missing message id", { status:400 });
  const { error } = await admin.rpc("record_sms_delivery_report", {
    p_provider_reference: messageId,
    p_status: payload.status || "unknown",
    p_phone: payload.phoneNumber || payload.phone || null,
    p_description: payload.description || payload.failureReason || null,
    p_payload: payload,
    p_cost: payload.cost ? Number(payload.cost) || null : null,
  });
  if (error) return Response.json({ error:error.message }, { status:500 });
  return new Response("OK", { status:200 });
});
