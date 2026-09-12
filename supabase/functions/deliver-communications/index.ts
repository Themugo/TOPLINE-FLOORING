import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-topline-worker-secret',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const workerSecret = Deno.env.get('TOPLINE_WORKER_SECRET') ?? '';
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

interface OutboxMessage {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject: string | null;
  message: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
}

async function sendEmail(message: OutboxMessage) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_FROM_EMAIL');
  const senderName = Deno.env.get('BREVO_FROM_NAME') || 'Topline Flooring and Waterproofing';
  if (!apiKey || !senderEmail) throw new Error('Email provider is not configured');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: message.recipient }],
      subject: message.subject || 'Topline Flooring and Waterproofing',
      textContent: message.message,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap">${escapeHtml(message.message)}</div>`,
    }),
  });
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  return { provider: 'brevo', reference: String(payload.messageId ?? '') };
}

async function sendSms(message: OutboxMessage) {
  const username = Deno.env.get('AT_USERNAME');
  const apiKey = Deno.env.get('AT_API_KEY');
  const senderId = Deno.env.get('AT_SENDER_ID');
  if (!username || !apiKey) throw new Error('SMS provider is not configured');

  const params = new URLSearchParams({ username, to: message.recipient, message: message.message });
  if (senderId) params.set('from', senderId);

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) throw new Error(`Africa's Talking ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const recipient = payload?.SMSMessageData?.Recipients?.[0];
  if (!recipient || !['Success', '101'].includes(String(recipient.status ?? recipient.statusCode))) {
    throw new Error(`SMS provider rejected delivery: ${JSON.stringify(payload)}`);
  }
  return { provider: 'africas-talking', reference: String(recipient.messageId ?? '') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Supabase worker configuration is incomplete' }, 500);

  const suppliedSecret = req.headers.get('x-topline-worker-secret');
  if (!workerSecret || suppliedSecret !== workerSecret) return json({ error: 'Unauthorized worker request' }, 401);

  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get('limit') || 25), 1), 100);
  const { data: messages, error } = await supabase.rpc('claim_communication_outbox_worker', { p_limit: limit });
  if (error) return json({ error: error.message }, 500);

  const results: Array<Record<string, unknown>> = [];
  for (const message of (messages ?? []) as OutboxMessage[]) {
    try {
      const delivery = message.channel === 'email'
        ? await sendEmail(message)
        : message.channel === 'sms'
          ? await sendSms(message)
          : (() => { throw new Error('WhatsApp provider is not configured'); })();

      const { error: completeError } = await supabase.rpc('complete_communication_delivery_worker', {
        p_outbox_id: message.id,
        p_provider: delivery.provider,
        p_provider_reference: delivery.reference || null,
      });
      if (completeError) throw completeError;
      results.push({ id: message.id, status: 'sent', provider: delivery.provider, reference: delivery.reference || null });
    } catch (deliveryError) {
      const errorMessage = deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
      const { error: failError } = await supabase.rpc('fail_communication_delivery_worker', {
        p_outbox_id: message.id,
        p_error_message: errorMessage.slice(0, 1000),
        p_retry: true,
      });
      results.push({ id: message.id, status: failError ? 'worker-error' : 'failed', error: errorMessage });
    }
  }

  return json({ processed: results.length, results });
});
