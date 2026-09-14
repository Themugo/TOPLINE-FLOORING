import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, hmacSha256Hex } from "../_shared/security.ts";

const MAX_BODY_BYTES = 512 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 300;

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function secretFor(provider: string): string | null {
  const normalized = provider.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return Deno.env.get(`PAYMENT_${normalized}_WEBHOOK_SECRET`) ?? Deno.env.get("PAYMENT_WEBHOOK_SECRET") ?? null;
}

async function verifySignature(req: Request, provider: string, rawBody: string): Promise<boolean> {
  const secret = secretFor(provider);
  const signatureHeader = req.headers.get("x-payment-signature");
  if (!secret || !signatureHeader) return false;
  const signature = signatureHeader.replace(/^sha256=/i, "").trim();
  const timestamp = req.headers.get("x-payment-timestamp");
  if (timestamp) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_CLOCK_SKEW_SECONDS) return false;
    return constantTimeEqual(signature, await hmacSha256Hex(secret, `${timestamp}.${rawBody}`));
  }
  return constantTimeEqual(signature, await hmacSha256Hex(secret, rawBody));
}

function text(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function numberValue(payload: Record<string, unknown>, ...keys: string[]): number | null {
  const value = text(payload, ...keys);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { success: false, error: "Method Not Allowed" });

  const provider = req.headers.get("x-payment-provider")?.trim().toLowerCase();
  const eventIdHeader = req.headers.get("x-payment-event-id")?.trim();
  if (!provider) return json(400, { success: false, error: "Missing provider" });

  const body = await req.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) return json(413, { success: false, error: "Payload too large" });
  const rawBody = new TextDecoder().decode(body);
  if (!(await verifySignature(req, provider, rawBody))) return json(401, { success: false, error: "Invalid payment signature" });

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    payload = parsed as Record<string, unknown>;
  } catch {
    return json(400, { success: false, error: "Invalid JSON payload" });
  }

  const providerEventId = eventIdHeader ?? text(payload, "event_id", "eventId", "id", "transaction_id", "transactionId");
  const eventType = text(payload, "event_type", "eventType", "type", "status") ?? "unknown";
  const status = text(payload, "status", "payment_status", "paymentStatus") ?? eventType;
  const amount = numberValue(payload, "amount", "paid_amount", "value");
  const currency = text(payload, "currency", "currency_code") ?? "KES";
  const orderId = text(payload, "order_id", "orderId", "merchant_reference", "account_reference");
  const transactionId = text(payload, "provider_transaction_id", "transaction_id", "transactionId", "receipt", "receipt_number");
  const reference = text(payload, "provider_reference", "reference", "merchant_request_id", "checkout_request_id");

  if (!providerEventId) return json(400, { success: false, error: "Missing provider event ID" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(501, { success: false, error: "Provider adapter not configured: payment provider boundary is disabled until server credentials are configured; payment state was not changed." });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("apply_payment_provider_event", {
    p_provider: provider,
    p_provider_event_id: providerEventId,
    p_event_type: eventType,
    p_status: status,
    p_amount: amount,
    p_currency: currency,
    p_order_id: orderId,
    p_provider_transaction_id: transactionId,
    p_provider_reference: reference,
    p_payload: payload,
  });

  if (error) {
    console.error("payment webhook application failed", { provider, providerEventId, error: error.message });
    return json(500, { success: false, error: "Payment event could not be applied" });
  }
  return json(200, data ?? { success: true });
});
