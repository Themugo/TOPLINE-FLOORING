import { supabase } from '@/lib/supabase';

export interface CustomerJourneyEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  created_at: string;
  metadata: Record<string, unknown>;
}

export async function getCustomerJourney(): Promise<CustomerJourneyEvent[]> {
  const { data, error } = await supabase.rpc('get_customer_journey');
  if (error) throw error;
  return (data ?? []) as CustomerJourneyEvent[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.rpc('mark_notification_read', { p_notification_id: id });
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
}
