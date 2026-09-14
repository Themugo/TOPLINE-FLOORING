import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

 type OutboxMessage = {
  id: string;
  channel: "email" | "sms" | "whatsapp";
  recipient: string;
  subject: string | null;
  message: string;
  attempt_count: number;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const brevoSenderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
const brevoSenderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Topline Flooring & Waterproofing";
const brevoReplyToEmail = Deno.env.get("BREVO_REPLY_TO_EMAIL");
const whatsappProvider = Deno.env.get("WHATSAPP_PROVIDER") ?? "meta";
const whatsappAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const whatsappTemplateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
const whatsappTemplateLanguage = Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") ?? "en";
const atUsername = Deno.env.get("AT_USERNAME");
const atApiKey = Deno.env.get("AT_API_KEY");
const atSenderId = Deno.env.get("AT_SENDER_ID");
const workerSecret = Deno.env.get("TOPLINE_WORKER_SECRET");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service configuration");
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

function textToHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
}

async function sendEmail(item: OutboxMessage) {
  if (!brevoApiKey || !brevoSenderEmail) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "api-key": brevoApiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: brevoSenderEmail, name: brevoSenderName },
      to: [{ email: item.recipient }],
      ...(brevoReplyToEmail ? { replyTo: { email: brevoReplyToEmail } } : {}),
      subject: item.subject ?? "Topline Flooring & Waterproofing",
      textContent: item.message,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6">${textToHtml(item.message)}</div>`,
      headers: { "Idempotency-Key": `topline-outbox-${item.id}` },
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${body.slice(0, 500)}`);
  let parsed: { messageId?: string } = {};
  try { parsed = JSON.parse(body); } catch { /* provider may return empty body */ }
  return { provider: "brevo", reference: parsed.messageId ?? null, httpStatus: response.status, raw: parsed };
}

async function sendSms(item: OutboxMessage) {
  if (!atUsername || !atApiKey) throw new Error("SMS provider is not configured");
  const params = new URLSearchParams({ username: atUsername, to: item.recipient, message: item.message });
  if (atSenderId) params.set("from", atSenderId);
  const response = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey: atApiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Africa's Talking ${response.status}: ${body.slice(0, 500)}`);
  let parsed: any = null;
  try { parsed = JSON.parse(body); } catch { parsed = null; }
  const recipient = parsed?.SMSMessageData?.Recipients?.[0];
  const status = String(recipient?.status ?? "").toLowerCase();
  const messageId = recipient?.messageId ? String(recipient.messageId) : null;
  const cost = recipient?.cost ? String(recipient.cost) : null;
  if (!messageId) throw new Error(`Africa's Talking accepted SMS without a messageId: ${body.slice(0, 500)}`);
  return { provider: "africastalking", reference: messageId, status, cost, httpStatus: response.status, raw: parsed ?? body };
}

async function sendWhatsApp(item: OutboxMessage) {
  if (whatsappProvider !== "meta") throw new Error(`Unsupported WhatsApp provider: ${whatsappProvider}`);
  if (!whatsappAccessToken || !whatsappPhoneNumberId) throw new Error("WhatsApp Meta provider is not configured");
  const to = item.recipient.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(to)) throw new Error("Invalid WhatsApp recipient number");
  const body: Record<string, unknown> = { messaging_product: "whatsapp", recipient_type: "individual", to, biz_opaque_callback_data: item.id };
  if (whatsappTemplateName) {
    body.type = "template";
    body.template = { name: whatsappTemplateName, language: { code: whatsappTemplateLanguage }, components: [{ type: "body", parameters: [{ type: "text", text: item.message.slice(0, 4096) }] }] };
  } else {
    body.type = "text";
    body.text = { preview_url: true, body: item.message.slice(0, 4096) };
  }
  const response = await fetch(`https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${whatsappAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Meta WhatsApp ${response.status}: ${raw.slice(0, 500)}`);
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { /* no-op */ }
  const reference = parsed?.messages?.[0]?.id ? String(parsed.messages[0].id) : null;
  if (!reference) throw new Error(`Meta WhatsApp accepted without message id: ${raw.slice(0, 500)}`);
  return { provider: "meta_whatsapp", reference, httpStatus: response.status, raw: parsed };
}

async function recordAttempt(item: OutboxMessage, requestId: string, outcome: string, extra: Record<string, unknown> = {}) {
  const { error } = await admin.rpc("record_communication_delivery_attempt_worker", {
    p_outbox_id: item.id,
    p_attempt_number: item.attempt_count,
    p_provider: item.channel === "email" ? "brevo" : item.channel === "sms" ? "africastalking" : "meta_whatsapp",
    p_channel: item.channel,
    p_request_id: requestId,
    p_outcome: outcome,
    p_http_status: typeof extra.httpStatus === "number" ? extra.httpStatus : null,
    p_provider_reference: typeof extra.reference === "string" ? extra.reference : null,
    p_error_message: typeof extra.error === "string" ? extra.error : null,
    p_response_payload: extra.raw ?? {},
  });
  if (error) console.error("delivery attempt audit failed", error);
}

async function processItem(item: OutboxMessage) {
  const requestId = crypto.randomUUID();
  await recordAttempt(item, requestId, "started");
  try {
    const result = item.channel === "email" ? await sendEmail(item) : item.channel === "sms" ? await sendSms(item) : await sendWhatsApp(item);
    await recordAttempt(item, requestId, "accepted", result);

    let completionUncertain = false;
    const { error } = await admin.rpc("complete_communication_delivery_worker", {
      p_outbox_id: item.id,
      p_provider: result.provider,
      p_provider_reference: result.reference,
      p_provider_message_id: result.reference,
    });
    if (error) { completionUncertain = true; throw error; }

    if (item.channel === "sms" && result.reference) {
      const { error: reportError } = await admin.rpc("record_sms_delivery_report", {
        p_provider_reference: result.reference,
        p_status: result.status === "success" ? "submitted" : (result.status || "submitted"),
        p_phone: item.recipient,
        p_payload: result.raw ?? {},
        p_cost: result.cost ? Number(result.cost.replace(/[^0-9.]/g, "")) || null : null,
      });
      if (reportError) console.error("initial SMS status audit failed", reportError);
    }
    return { id: item.id, status: "sent", provider: result.provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordAttempt(item, requestId, completionUncertain ? "uncertain" : "failed", { error: message });
    const { error: failError } = completionUncertain
      ? await admin.rpc("mark_communication_delivery_uncertain_worker", { p_outbox_id: item.id, p_error_message: message })
      : await admin.rpc("fail_communication_delivery_worker", { p_outbox_id: item.id, p_error_message: message, p_retry: true });
    if (failError) throw failError;
    return { id: item.id, status: "failed_or_requeued", error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!workerSecret || req.headers.get("x-topline-worker-secret") !== workerSecret) return new Response("Unauthorized", { status: 401 });
  if ((req.headers.get("content-length") && Number(req.headers.get("content-length")) > 32768)) return new Response("Payload Too Large", { status: 413 });
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 10), 50));
    const { data, error } = await admin.rpc("claim_communication_outbox_worker", { p_limit: limit });
    if (error) throw error;
    const results = [];
    for (const item of (data ?? []) as OutboxMessage[]) results.push(await processItem(item));
    return Response.json({ processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
