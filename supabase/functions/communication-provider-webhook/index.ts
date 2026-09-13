import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { constantTimeEqual, type WebhookPayload } from "../_shared/security.ts";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const secret = Deno.env.get("COMMUNICATION_WEBHOOK_SECRET");
if (!url || !key || !secret) throw new Error("Communication webhook is not configured");
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!constantTimeEqual(req.headers.get("x-topline-webhook-secret"), secret)) return new Response("Unauthorized", { status: 401 });
  const raw = await req.text();
  if (raw.length > 1_048_576) return new Response("Payload Too Large", { status: 413 });
  const body = JSON.parse(raw) as WebhookPayload;

  if (body?.event) {
    const event = String(body.event);
    const lower = event.toLowerCase();
    const providerMessageId = body["message-id"] ? String(body["message-id"]) : body.messageId ? String(body.messageId) : body.id ? String(body.id) : null;
    const recipient = body.email || body.to || body.contactNumber || body.senderNumber || null;
    const channel = lower.includes("whatsapp") ? "whatsapp" : (body.email ? "email" : (body.contactNumber || body.phoneNumber || body.senderNumber ? "sms" : "email"));
    const { error } = await admin.rpc("record_provider_delivery_event_worker", {
      p_provider: "brevo",
      p_channel: channel,
      p_event_type: event,
      p_provider_message_id: providerMessageId,
      p_provider_reference: providerMessageId,
      p_recipient: recipient,
      p_payload: body,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (body?.eventName) {
    const visitor = body.visitor || {};
    const attrs = visitor.attributes || visitor.contactAttributes || {};
    const source = String(visitor.source || "").toLowerCase();
    const channel = source === "email" ? "email" : "whatsapp";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    for (const m of messages) {
      if (m.type !== "visitor" || m.isTrigger) continue;
      const sender = attrs.WHATSAPP || attrs.SMS || attrs.email || visitor.displayedName || "unknown";
      const message = String(m.text || "").trim();
      if (!message) continue;
      const { error } = await admin.rpc("record_inbound_communication_worker", {
        p_provider: "brevo_conversations",
        p_channel: channel,
        p_sender: String(sender),
        p_recipient: null,
        p_subject: m.subject || null,
        p_message: message,
        p_provider_message_id: m.id ? String(m.id) : null,
        p_conversation_id: body.conversationId ? String(body.conversationId) : null,
        p_media_url: m.file?.link || null,
        p_payload: m,
      });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ignored: true });
});
