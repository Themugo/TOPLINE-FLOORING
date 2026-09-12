import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OutboxMessage = {
  id: string;
  channel: "email" | "sms" | "whatsapp";
  recipient: string;
  subject: string | null;
  message: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const brevoSenderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
const brevoSenderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Topline Flooring & Water Roofing";
const atUsername = Deno.env.get("AT_USERNAME");
const atApiKey = Deno.env.get("AT_API_KEY");
const atSenderId = Deno.env.get("AT_SENDER_ID");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase service configuration");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function textToHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

async function sendEmail(item: OutboxMessage) {
  if (!brevoApiKey || !brevoSenderEmail) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: brevoSenderEmail, name: brevoSenderName },
      to: [{ email: item.recipient }],
      subject: item.subject ?? "Topline Flooring & Water Roofing",
      textContent: item.message,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6">${textToHtml(item.message)}</div>`,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${body.slice(0, 500)}`);
  const parsed = JSON.parse(body) as { messageId?: string };
  return { provider: "brevo", reference: parsed.messageId ?? null };
}

async function sendSms(item: OutboxMessage) {
  if (!atUsername || !atApiKey) throw new Error("SMS provider is not configured");
  const params = new URLSearchParams({
    username: atUsername,
    to: item.recipient,
    message: item.message,
  });
  if (atSenderId) params.set("from", atSenderId);
  const response = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey: atApiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Africa's Talking ${response.status}: ${body.slice(0, 500)}`);
  return { provider: "africastalking", reference: body.slice(0, 500) };
}

async function processItem(item: OutboxMessage) {
  try {
    let result: { provider: string; reference: string | null };
    if (item.channel === "email") result = await sendEmail(item);
    else if (item.channel === "sms") result = await sendSms(item);
    else throw new Error("WhatsApp delivery is not configured for this deployment");

    const { error } = await admin.rpc("complete_communication_delivery_worker", {
      p_outbox_id: item.id,
      p_provider: result.provider,
      p_provider_reference: result.reference,
    });
    if (error) throw error;
    return { id: item.id, status: "sent", provider: result.provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { error: failError } = await admin.rpc("fail_communication_delivery_worker", {
      p_outbox_id: item.id,
      p_error_message: message,
      p_retry: true,
    });
    if (failError) throw failError;
    return { id: item.id, status: "failed_or_requeued", error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

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
