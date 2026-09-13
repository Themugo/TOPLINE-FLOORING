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
  const form = await req.formData().catch(() => null);
  let payload: Record<string, string> = {};
  if (form) for (const [k,v] of form.entries()) payload[k] = String(v);
  if (!Object.keys(payload).length) {
    const body = await req.json().catch(() => ({}));
    payload = Object.fromEntries(Object.entries(body).map(([k,v]) => [k,String(v ?? "")]));
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
