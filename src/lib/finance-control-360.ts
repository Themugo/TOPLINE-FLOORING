import { supabase } from '@/lib/supabase';

export async function getFinanceControl360(days = 30) {
  const { data, error } = await supabase.rpc('get_finance_control_360', { p_days: days });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function reconcileFinanceControl360(orderId?: string) {
  const { data, error } = await supabase.rpc('reconcile_finance_control_360', { p_order_id: orderId || null });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
