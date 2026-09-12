import { supabase } from '@/lib/supabase';

export type CommunicationsJourney360 = {
  period_days: number;
  metrics: Record<string, number>;
  channels: Array<Record<string, unknown>>;
  recent_failures: Array<Record<string, unknown>>;
  unmatched_inbound: Array<Record<string, unknown>>;
  workflow_events: Array<Record<string, unknown>>;
};

export async function getCommunicationsJourney360(days = 30): Promise<CommunicationsJourney360> {
  const { data, error } = await supabase.rpc('get_communications_customer_journey_360', { p_days: days });
  if (error) throw error;
  return (data ?? { period_days: days, metrics: {}, channels: [], recent_failures: [], unmatched_inbound: [], workflow_events: [] }) as CommunicationsJourney360;
}

export async function reconcileCommunications360(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('reconcile_communications_360');
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
