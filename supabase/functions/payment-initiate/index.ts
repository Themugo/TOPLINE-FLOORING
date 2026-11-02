import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handlePreflight, isAllowedSiteUrl, jsonResponse } from "../_shared/cors.ts";
import { constantTimeEqual } from "../_shared/security.ts";

type TargetType = "order" | "invoice";
type PaymentMethod = "mpesa" | "card" | "bank_transfer";

interface GatewayRow {
  gateway_key: string;
  payment_method: PaymentMethod;
  provider: string | null;
  supports_orders: boolean;
  supports_invoices: boolean;
  requires_customer_phone: boolean;
  public_config: Record<string, unknown> | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_paid: number | null;
  status: string;
  customer_email: string | null;
  customer_phone: string | null;
}

interface PaymentTarget {
  reference: string;
  email: string | null;
  phone: string | null;
  amount: number;
}

interface ProviderResponse {
  access_token?: string;
  ResponseCode?: string | number;
  errorMessage?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  message?: string;
  error?: string;
  checkout_url?: string;
  redirect_url?: string;
  url?: string;
  transaction_id?: string;
  id?: string;
  reference?: string;
  expires_at?: string;
}

const clean = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const safeUrl = (value: string | null): string | null => (value && /^https:\/\//i.test(value) ? value : null);
const nowIso = () => new Date().toISOString();

async function tokenHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function mpesaToken(key: string, secret: string, base: string): Promise<string> {
  const basic = btoa(`${key}:${secret}`);
  const response = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("M-Pesa authentication failed");
  const json = (await response.json()) as ProviderResponse;
  if (!json.access_token) throw new Error("M-Pesa authentication returned no token");
  return json.access_token;
}

function normalizeMpesaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if ((digits.startsWith("07") || digits.startsWith("01")) && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return `254${digits}`;
  return null;
}

function mpesaTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Called from the customer's browser (checkout and customer portal). The caller proves ownership of the
// order/invoice by its customer email, and later reads the result with the one-time access token that
// is returned here (stored only as a hash), so verify_jwt is disabled for this function in config.toml.
Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const reply = (status: number, body: Record<string, unknown>) => jsonResponse(req, status, body);
  if (req.method !== "POST") return reply(405, { success: false, error: "Method Not Allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(501, { success: false, error: "Payment service is not configured" });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return reply(400, { success: false, error: "Invalid JSON" });
  }

  const targetType = clean(body.target_type) as TargetType | null;
  const targetId = clean(body.target_id);
  const method = clean(body.payment_method) as PaymentMethod | null;
  const gatewayKey = clean(body.gateway_key);
  const idempotency = clean(body.idempotency_key) || crypto.randomUUID();
  const phone = clean(body.phone);
  const email = clean(body.email);
  const rawReturnUrl = clean(body.return_url);
  const returnUrl = safeUrl(rawReturnUrl);

  // The one-time payment access token is appended to the return URL and the gateway redirects the
  // customer there, so it must point back at Topline and nowhere else.
  if (rawReturnUrl && (!returnUrl || !isAllowedSiteUrl(returnUrl))) {
    return reply(400, { success: false, error: "Return URL is not permitted" });
  }

  if (!targetType || !targetId || !method || !gatewayKey || !email) {
    return reply(400, { success: false, error: "Payment target, method, gateway and customer email are required" });
  }
  if (!["order", "invoice"].includes(targetType) || !["mpesa", "card", "bank_transfer"].includes(method)) {
    return reply(400, { success: false, error: "Unsupported payment request" });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. The gateway must be enabled, customer-visible and valid for this kind of payment.
  const { data: gatewayData, error: gatewayError } = await db
    .from("payment_gateway_methods")
    .select("*")
    .eq("gateway_key", gatewayKey)
    .eq("payment_method", method)
    .eq("is_enabled", true)
    .eq("customer_visible", true)
    .maybeSingle();
  const gateway = gatewayData as GatewayRow | null;
  if (gatewayError || !gateway) {
    return reply(409, { success: false, error: "This payment method is not currently available" });
  }
  if (!(targetType === "order" ? gateway.supports_orders : gateway.supports_invoices)) {
    return reply(409, { success: false, error: "This payment method is not available for this payment" });
  }

  // 2. Online providers must be production-certified (release gate).
  if (method === "mpesa" || method === "card") {
    const { data: releaseGate, error: releaseError } = await db.rpc("get_payment_provider_release_gate_360", {
      p_gateway_key: gatewayKey,
    });
    if (releaseError || !(releaseGate as { ready?: boolean } | null)?.ready) {
      return reply(503, {
        success: false,
        error: "This payment provider is not production-certified and is temporarily unavailable",
      });
    }
  }

  // 3. Load the order or invoice and make sure it belongs to the caller and still needs paying.
  let target: PaymentTarget;
  if (targetType === "order") {
    const { data, error } = await db
      .from("orders")
      .select("id,order_number,total_amount,payment_status,customer_email,customer_phone,status")
      .eq("id", targetId)
      .maybeSingle();
    const order = data as OrderRow | null;
    if (error || !order) return reply(404, { success: false, error: "Order not found" });
    if (order.status === "cancelled") return reply(409, { success: false, error: "Cancelled orders cannot be paid" });
    if (String(order.customer_email ?? "").toLowerCase() !== email.toLowerCase()) {
      return reply(403, { success: false, error: "Payment customer does not match the order" });
    }
    // Never start a provider charge for money that is already settled or returned. The
    // reconciliation RPC would reject the late payment, but the customer would already be charged.
    if (order.payment_status === "paid") return reply(409, { success: false, error: "This order is already paid" });
    if (order.payment_status === "refunded") return reply(409, { success: false, error: "This order has been refunded and can no longer be paid. Please contact Topline support." });
    // Charge only the outstanding balance so a part-paid order cannot be overcharged.
    const { data: settledRows, error: settledError } = await db
      .from("payment_transactions")
      .select("amount")
      .eq("order_id", order.id)
      .eq("status", "successful");
    if (settledError) return reply(503, { success: false, error: "Unable to verify the order balance. Please try again shortly." });
    const settledTotal = (settledRows ?? []).reduce((sum: number, row: { amount: number | string | null }) => sum + Number(row.amount ?? 0), 0);
    target = {
      reference: order.order_number,
      email: order.customer_email,
      phone: order.customer_phone,
      amount: Math.max(Number(order.total_amount) - settledTotal, 0),
    };
  } else {
    const { data, error } = await db
      .from("invoices")
      .select("id,invoice_number,total_amount,amount_paid,status,customer_email,customer_phone")
      .eq("id", targetId)
      .maybeSingle();
    const invoice = data as InvoiceRow | null;
    if (error || !invoice) return reply(404, { success: false, error: "Invoice not found" });
    if (invoice.status === "cancelled" || invoice.status === "paid") {
      return reply(409, { success: false, error: "Invoice is not payable" });
    }
    if (String(invoice.customer_email ?? "").toLowerCase() !== email.toLowerCase()) {
      return reply(403, { success: false, error: "Payment customer does not match the invoice" });
    }
    target = {
      reference: invoice.invoice_number,
      email: invoice.customer_email,
      phone: invoice.customer_phone,
      amount: Math.max(Number(invoice.total_amount) - Number(invoice.amount_paid ?? 0), 0),
    };
  }

  const amount = target.amount;
  const customerPhone = phone || target.phone;
  if (!Number.isFinite(amount) || amount <= 0) {
    return reply(409, { success: false, error: "No outstanding balance remains" });
  }
  if (gateway.requires_customer_phone && !customerPhone) {
    return reply(400, { success: false, error: "A customer phone number is required for this payment method" });
  }

  // 4. Idempotency: retries reuse the same attempt. A known pre-dispatch failure may
  // safely retry that attempt; an uncertain/provider-dispatched attempt is never charged again.
  const { data: existing } = await db
    .from("payment_attempts")
    .select("id,payment_transaction_id,status,target_type,target_id,gateway_key,payment_method")
    .eq("idempotency_key", idempotency)
    .maybeSingle();
  const accessToken = crypto.randomUUID();
  const customerReturnUrl = returnUrl
    ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}attempt_id=__ATTEMPT__&access_token=${encodeURIComponent(accessToken)}`
    : null;
  let tx: { id: string };
  let attempt: { id: string };

  if (existing) {
    if (existing.target_type !== targetType || existing.target_id !== targetId || existing.gateway_key !== gatewayKey || existing.payment_method !== method) {
      return reply(409, { success: false, error: "This checkout retry key belongs to a different payment target or gateway. Refresh checkout and start a new payment attempt." });
    }
    const { data: replayTx } = await db.from("payment_transactions")
      .select("amount,currency,method,checkout_url,metadata")
      .eq("id", existing.payment_transaction_id).maybeSingle();
    const replayMetadata = (replayTx?.metadata || {}) as { initiation_outcome?: string; instructions?: Record<string, unknown> };
    if (existing.status === "failed" && replayMetadata.initiation_outcome === "not_dispatched") {
      // This attempt is known not to have reached the provider, so retrying it cannot
      // create a duplicate charge. Keep the original ledger IDs and idempotency key.
      const { error: txRetryError } = await db.from("payment_transactions").update({
        status: "pending", failure_reason: null, completed_at: null, initiated_at: nowIso(),
        metadata: { gateway_key: gatewayKey, target_type: targetType, initiation_outcome: "retrying" }, updated_at: nowIso(),
      }).eq("id", existing.payment_transaction_id);
      const { error: attemptRetryError } = await db.from("payment_attempts").update({
        status: "initiated", failure_reason: null, public_token_hash: await tokenHash(accessToken),
        return_url: returnUrl, updated_at: nowIso(),
      }).eq("id", existing.id);
      if (txRetryError || attemptRetryError) return reply(503, { success: false, error: "The previous payment attempt could not be safely resumed. Please contact Topline support." });
      tx = { id: existing.payment_transaction_id };
      attempt = { id: existing.id };
    } else {
      // The original response may have been lost when the browser closed or the network
      // disconnected. Reissue a fresh one-time status token for the same ledger attempt;
      // never initiate a second provider charge for an idempotent replay.
      const { error: tokenUpdateError } = await db.from("payment_attempts")
        .update({ public_token_hash: await tokenHash(accessToken), return_url: returnUrl, updated_at: nowIso() })
        .eq("id", existing.id);
      if (tokenUpdateError) return reply(503, { success: false, error: "Existing payment was found but its secure recovery link could not be refreshed. Please contact Topline support." });
      const replayReturnUrl = returnUrl
        ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}attempt_id=${encodeURIComponent(existing.id)}&access_token=${encodeURIComponent(accessToken)}`
        : null;
      return reply(200, {
        success: true, attempt_id: existing.id, payment_transaction_id: existing.payment_transaction_id,
        status: existing.status, payment_method: replayTx?.method || method,
        amount: Number(replayTx?.amount ?? amount), currency: replayTx?.currency || "KES",
        checkout_url: replayTx?.checkout_url || undefined,
        instructions: replayMetadata.instructions || undefined,
        access_token: accessToken, return_url: replayReturnUrl, idempotent_replay: true,
        message: existing.status === "pending" ? "Your existing payment attempt is being checked. Do not start another payment." : undefined,
      });
    }
  } else {
    // A fresh idempotency key (new browser session, second device, different gateway) must not
    // start a second live provider charge while an earlier attempt for the same target is still
    // awaiting its callback. Bank-transfer instructions are excluded: they do not move money here.
    const { data: inflightRows, error: inflightError } = await db
      .from("payment_transactions")
      .select("id,created_at,checkout_expires_at,method")
      .eq(targetType === "order" ? "order_id" : "invoice_id", targetId)
      .eq("status", "pending")
      .neq("method", "bank_transfer")
      .order("created_at", { ascending: false })
      .limit(10);
    if (inflightError) return reply(503, { success: false, error: "Unable to verify existing payment attempts. Please try again shortly." });
    const nowMs = Date.now();
    const inflight = (inflightRows ?? []).some((row: { created_at: string; checkout_expires_at: string | null }) => {
      const expiresAt = row.checkout_expires_at ? Date.parse(row.checkout_expires_at) : Date.parse(row.created_at) + 3 * 60_000;
      return Number.isFinite(expiresAt) && expiresAt > nowMs;
    });
    if (inflight) {
      return reply(409, { success: false, error: `A payment for this ${targetType} is already in progress. Please wait a few minutes for the provider confirmation before trying again.` });
    }

    const { data: createdTx, error: txError } = await db
      .from("payment_transactions")
      .insert({
        order_id: targetType === "order" ? targetId : null,
        invoice_id: targetType === "invoice" ? targetId : null,
        amount,
        currency: "KES",
        method,
        provider: gateway.provider,
        status: "pending",
        idempotency_key: `attempt:${idempotency}`,
        metadata: { gateway_key: gatewayKey, target_type: targetType, initiation_outcome: "not_dispatched" },
        customer_phone: customerPhone,
        initiated_at: nowIso(),
      })
      .select("id")
      .single();
    if (txError || !createdTx) return reply(500, { success: false, error: "Unable to create payment transaction" });
    tx = { id: createdTx.id };

    const { data: createdAttempt, error: attemptError } = await db
      .from("payment_attempts")
      .insert({
        payment_transaction_id: tx.id,
        target_type: targetType,
        target_id: targetId,
        gateway_key: gatewayKey,
        payment_method: method,
        idempotency_key: idempotency,
        public_token_hash: await tokenHash(accessToken),
        status: "initiated",
        return_url: returnUrl,
      })
      .select("id")
      .single();
    if (attemptError || !createdAttempt) return reply(500, { success: false, error: "Unable to create payment attempt" });
    attempt = { id: createdAttempt.id };
  }

  // 5. Start the payment with the provider. Once a charge request is dispatched, a timeout
  // is an unknown outcome (the provider may have accepted it), not proof of failure.
  let providerRequestDispatched = false;
  try {
    const resolvedReturnUrl = customerReturnUrl?.replace("__ATTEMPT__", attempt.id) ?? null;

    if (method === "bank_transfer") {
      const rawConfig = gateway.public_config ?? {};
      const allowedBankKeys = ["bank_name", "account_name", "account_number", "branch", "swift_code", "reference_format", "instructions"];
      const safeConfig = Object.fromEntries(Object.entries(rawConfig).filter(([key]) => allowedBankKeys.includes(key)));
      await db
        .from("payment_transactions")
        .update({
          status: "pending",
          checkout_expires_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
          metadata: { gateway_key: gatewayKey, instructions: safeConfig },
          updated_at: nowIso(),
        })
        .eq("id", tx.id);
      await db.from("payment_attempts").update({ status: "pending", updated_at: nowIso() }).eq("id", attempt.id);
      return reply(200, {
        success: true,
        attempt_id: attempt.id,
        payment_transaction_id: tx.id,
        status: "pending",
        payment_method: method,
        amount,
        currency: "KES",
        instructions: safeConfig,
        access_token: accessToken,
        return_url: resolvedReturnUrl,
      });
    }

    if (method === "mpesa") {
      const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
      const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
      const shortcode = Deno.env.get("MPESA_SHORTCODE");
      const passkey = Deno.env.get("MPESA_PASSKEY");
      const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL");
      if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
        throw new Error("M-Pesa is enabled but server credentials/configuration are incomplete");
      }
      // payment-callback rejects callbacks without ?secret=<MPESA_CALLBACK_SECRET>. Refuse to send a prompt whose
      // callback would be rejected: the customer would pay and the payment would never be recorded.
      const mpesaCallbackSecret = Deno.env.get("MPESA_CALLBACK_SECRET");
      let callbackSecretInUrl: string | null = null;
      try { callbackSecretInUrl = new URL(callbackUrl).searchParams.get("secret"); } catch { /* invalid URL handled below */ }
      if (!mpesaCallbackSecret || !constantTimeEqual(callbackSecretInUrl, mpesaCallbackSecret)) {
        throw new Error("M-Pesa callback URL must include ?secret= matching MPESA_CALLBACK_SECRET");
      }
      const mpesaPhone = normalizeMpesaPhone(String(customerPhone ?? ""));
      if (!mpesaPhone) throw new Error("Enter a valid Kenyan M-Pesa phone number (07xx, 01xx or 254xx)");
      if (!Number.isInteger(amount)) throw new Error("M-Pesa payments must use a whole KES amount");

      const base = (Deno.env.get("MPESA_BASE_URL") || "https://api.safaricom.co.ke").replace(/\/$/, "");
      const token = await mpesaToken(consumerKey, consumerSecret, base);
      const timestamp = mpesaTimestamp();
      const stk = {
        BusinessShortCode: shortcode,
        Password: btoa(`${shortcode}${passkey}${timestamp}`),
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: mpesaPhone,
        PartyB: shortcode,
        PhoneNumber: mpesaPhone,
        CallBackURL: callbackUrl,
        AccountReference: target.reference,
        TransactionDesc: `Topline ${targetType} payment`,
      };
      providerRequestDispatched = true;
      const response = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(stk),
        signal: AbortSignal.timeout(30_000),
      });
      const result = (await response.json()) as ProviderResponse;
      if (!response.ok || (result.ResponseCode && String(result.ResponseCode) !== "0")) {
        throw new Error(result.errorMessage || result.ResponseDescription || "M-Pesa STK request failed");
      }

      const { error: txUpdateError } = await db
        .from("payment_transactions")
        .update({
          provider_transaction_id: result.CheckoutRequestID,
          provider_reference: result.MerchantRequestID,
          checkout_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
          metadata: {
            gateway_key: gatewayKey,
            merchant_request_id: result.MerchantRequestID,
            checkout_request_id: result.CheckoutRequestID,
          },
          updated_at: nowIso(),
        })
        .eq("id", tx.id);
      if (txUpdateError) throw new Error("M-Pesa request accepted but payment ledger could not be updated");

      const { error: attemptUpdateError } = await db
        .from("payment_attempts")
        .update({
          status: "pending",
          provider_request_id: result.MerchantRequestID,
          provider_checkout_id: result.CheckoutRequestID,
          updated_at: nowIso(),
        })
        .eq("id", attempt.id);
      if (attemptUpdateError) throw new Error("M-Pesa request accepted but payment attempt could not be updated");

      return reply(200, {
        success: true,
        attempt_id: attempt.id,
        payment_transaction_id: tx.id,
        status: "pending",
        payment_method: method,
        amount,
        currency: "KES",
        message: result.CustomerMessage || "Check your phone and enter your M-Pesa PIN.",
        access_token: accessToken,
        return_url: resolvedReturnUrl,
      });
    }

    // Card
    const cardUrl = clean((gateway.public_config ?? {}).initiation_url) || Deno.env.get("CARD_GATEWAY_INITIATE_URL");
    const cardSecret = Deno.env.get("CARD_GATEWAY_SECRET");
    if (!cardUrl || !cardSecret) {
      throw new Error("Card gateway is enabled but its server initiation configuration is incomplete");
    }
    const callback =
      Deno.env.get("PAYMENT_CARD_CALLBACK_URL") || Deno.env.get("PAYMENT_CALLBACK_URL") || `${url}/functions/v1/payment-callback`;
    providerRequestDispatched = true;
    const response = await fetch(cardUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${cardSecret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency: "KES",
        reference: target.reference,
        order_id: targetType === "order" ? targetId : null,
        invoice_id: targetType === "invoice" ? targetId : null,
        customer: { email, phone: customerPhone },
        return_url: resolvedReturnUrl,
        callback_url: callback,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = (await response.json()) as ProviderResponse;
    if (!response.ok) throw new Error(result.message || result.error || "Card gateway checkout could not be created");
    const checkoutUrl = safeUrl(clean(result.checkout_url) || clean(result.redirect_url) || clean(result.url));
    const providerTransaction = clean(result.transaction_id) || clean(result.id);
    if (!checkoutUrl) throw new Error("Card gateway did not return a secure (https) checkout URL");

    await db
      .from("payment_transactions")
      .update({
        provider_transaction_id: providerTransaction,
        provider_reference: clean(result.reference) || target.reference,
        checkout_url: checkoutUrl,
        checkout_expires_at: result.expires_at || null,
        metadata: { gateway_key: gatewayKey, card_response: { reference: clean(result.reference) || null } },
        updated_at: nowIso(),
      })
      .eq("id", tx.id);
    await db
      .from("payment_attempts")
      .update({ status: "pending", provider_checkout_id: providerTransaction, updated_at: nowIso() })
      .eq("id", attempt.id);

    return reply(200, {
      success: true,
      attempt_id: attempt.id,
      payment_transaction_id: tx.id,
      status: "pending",
      payment_method: method,
      amount,
      currency: "KES",
      checkout_url: checkoutUrl,
      access_token: accessToken,
      return_url: resolvedReturnUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment initiation failed";
    if (providerRequestDispatched) {
      const recoveryMessage = "The provider response was not confirmed. Your payment may still be processing; do not start another payment. Check your payment status or contact Topline support.";
      await db.from("payment_transactions").update({
        status: "pending", failure_reason: recoveryMessage, updated_at: nowIso(),
        metadata: { gateway_key: gatewayKey, target_type: targetType, initiation_outcome: "unknown", initiation_error: message },
      }).eq("id", tx.id);
      await db.from("payment_attempts").update({ status: "pending", failure_reason: recoveryMessage, updated_at: nowIso() }).eq("id", attempt.id);
      return reply(200, {
        success: true, status: "pending", initiation_uncertain: true,
        message: recoveryMessage, attempt_id: attempt.id, payment_transaction_id: tx.id,
        payment_method: method, amount, currency: "KES", access_token: accessToken,
        return_url: customerReturnUrl?.replace("__ATTEMPT__", attempt.id) ?? null,
      });
    }
    await db.from("payment_transactions").update({ status: "failed", failure_reason: message, completed_at: nowIso(), metadata: { gateway_key: gatewayKey, target_type: targetType, initiation_outcome: "not_dispatched", initiation_error: message }, updated_at: nowIso() }).eq("id", tx.id);
    await db.from("payment_attempts").update({ status: "failed", failure_reason: message, updated_at: nowIso() }).eq("id", attempt.id);
    return reply(502, { success: false, error: message, attempt_id: attempt.id });
  }
});
