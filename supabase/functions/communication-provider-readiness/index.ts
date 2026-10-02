import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { constantTimeEqual } from "../_shared/security.ts";

const secret = Deno.env.get("TOPLINE_WORKER_SECRET");
if (!secret) throw new Error("Provider readiness is not configured");

const checks = [
  { provider: "brevo", channel: "email", keys: ["BREVO_API_KEY", "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME", "COMMUNICATION_WEBHOOK_SECRET"] },
  { provider: "africastalking", channel: "sms", keys: ["AT_USERNAME", "AT_API_KEY", "AT_SENDER_ID", "AT_DLR_SECRET"] },
  { provider: "meta_whatsapp", channel: "whatsapp", keys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"] },
] as const;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!constantTimeEqual(req.headers.get("x-topline-worker-secret"), secret)) return new Response("Unauthorized", { status: 401 });
  const providers = checks.map((check) => {
    const missing = check.keys.filter((key) => !Deno.env.get(key));
    return { provider: check.provider, channel: check.channel, configured: missing.length === 0, missing_keys: missing };
  });
  const ready = providers.every((provider) => provider.configured);
  return Response.json({
    checked_at: new Date().toISOString(),
    ready,
    providers,
    credentials_exposed: false,
    note: "This endpoint checks presence only; it never returns secret values and does not activate providers by itself. Real provider UAT remains required before activation."
  }, { status: ready ? 200 : 503 });
});
