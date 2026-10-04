import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

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
  const returnUrl = safeUrl(clean(body.return_url));

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
    target = {
      reference: order.order_number,
      email: order.customer_email,
      phone: order.customer_phone,
      amount: Number(order.total_amount),
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

  // 4. Idempotency: a retry with the same key returns the original attempt instead of charging twice.
  const { data: existing } = await db
    .from("payment_attempts")
    .select("id,payment_transaction_id,status")
    .eq("idempotency_key", idempotency)
    .maybeSingle();
  if (existing) {
    return reply(200, {
      success: true,
      attempt_id: existing.id,
      payment_transaction_id: existing.payment_transaction_id,
      status: existing.status,
      idempotent_replay: true,
    });
  }

  const accessToken = crypto.randomUUID();
  const customerReturnUrl = returnUrl
    ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}attempt_id=__ATTEMPT__&access_token=${encodeURIComponent(accessToken)}`
    : null;

  const { data: tx, error: txError } = await db
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
      metadata: { gateway_key: gatewayKey, target_type: targetType },
      customer_phone: customerPhone,
      initiated_at: nowIso(),
    })
    .select("id")
    .single();
  if (txError || !tx) return reply(500, { success: false, error: "Unable to create payment transaction" });

  const { data: attempt, error: attemptError } = await db
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
  if (attemptError || !attempt) return reply(500, { success: false, error: "Unable to create payment attempt" });

  // 5. Start the payment with the provider. Any failure closes both ledger rows.
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
    const checkoutUrl = clean(result.checkout_url) || clean(result.redirect_url) || clean(result.url);
    const providerTransaction = clean(result.transaction_id) || clean(result.id);
    if (!checkoutUrl) throw new Error("Card gateway did not return a checkout URL");

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
    await db
      .from("payment_transactions")
      .update({ status: "failed", failure_reason: message, completed_at: nowIso(), updated_at: nowIso() })
      .eq("id", tx.id);
    await db
      .from("payment_attempts")
      .update({ status: "failed", failure_reason: message, updated_at: nowIso() })
      .eq("id", attempt.id);
    return reply(502, { success: false, error: message, attempt_id: attempt.id });
  }
});
