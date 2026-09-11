import { supabase } from '@/lib/supabase';

export interface QueueMessageInput {
  customerId: string;
  channel: 'email' | 'whatsapp' | 'sms';
  recipient: string;
  message: string;
  subject?: string;
}

export async function queueCustomerMessage(input: QueueMessageInput): Promise<string> {
  const { data, error } = await supabase.rpc('queue_customer_message', {
    p_customer_id: input.customerId,
    p_channel: input.channel,
    p_recipient: input.recipient,
    p_message: input.message,
    p_subject: input.subject || null,
  });
  if (error) throw error;
  return String(data);
}

export async function retryCustomerMessage(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('retry_communication_outbox', { p_outbox_id: id });
  if (error) throw error;
  return Boolean(data);
}

export async function cancelCustomerMessage(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_communication_outbox', { p_outbox_id: id });
  if (error) throw error;
  return Boolean(data);
}
