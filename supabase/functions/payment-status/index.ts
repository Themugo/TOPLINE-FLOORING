import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

interface AttemptRow {
  id: string;
  payment_transaction_id: string;
  target_type: string;
  target_id: string;
  public_token_hash: string | null;
  status: string;
  failure_reason: string | null;
}

interface TransactionRow {
  id: string;
  amount: number;
  currency: string;
  method: string;
  provider: string | null;
  provider_reference: string | null;
  status: string;
  failure_reason: string | null;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  paid_at: string | null;
  metadata: { instructions?: unknown } | null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Called from the customer's browser after checkout. Authorised by the one-time access token that
// payment-initiate returned for this attempt (stored only as a hash), so verify_jwt is disabled.
Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse(req, 405, { success: false, error: "Method Not Allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return jsonResponse(req, 501, { success: false, error: "Payment status service is not configured" });
  }

  let body: { attempt_id?: unknown; access_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { success: false, error: "Invalid JSON" });
  }
  const attemptId = typeof body.attempt_id === "string" ? body.attempt_id : null;
  const token = typeof body.access_token === "string" ? body.access_token : null;
  if (!attemptId || !token) {
    return jsonResponse(req, 400, { success: false, error: "Attempt and access token are required" });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: attemptData, error: attemptError } = await db
    .from("payment_attempts")
    .select("id,payment_transaction_id,target_type,target_id,public_token_hash,status,failure_reason")
    .eq("id", attemptId)
    .maybeSingle();
  const attempt = attemptData as AttemptRow | null;
  if (attemptError || !attempt || !attempt.public_token_hash || attempt.public_token_hash !== (await sha256Hex(token))) {
    return jsonResponse(req, 404, { success: false, error: "Payment attempt not found" });
  }

  const { data: txData, error: txError } = await db
    .from("payment_transactions")
    .select("id,amount,currency,method,provider,provider_reference,status,failure_reason,checkout_url,checkout_expires_at,paid_at,metadata")
    .eq("id", attempt.payment_transaction_id)
    .single();
  const tx = txData as TransactionRow | null;
  if (txError || !tx) return jsonResponse(req, 404, { success: false, error: "Payment transaction not found" });

  return jsonResponse(req, 200, {
    success: true,
    attempt_id: attempt.id,
    target_type: attempt.target_type,
    target_id: attempt.target_id,
    status: tx.status,
    amount: tx.amount,
    currency: tx.currency,
    method: tx.method,
    provider: tx.provider,
    provider_reference: tx.provider_reference,
    failure_reason: tx.failure_reason,
    checkout_url: tx.checkout_url,
    checkout_expires_at: tx.checkout_expires_at,
    paid_at: tx.paid_at,
    instructions: tx.metadata?.instructions ?? null,
  });
});
