import { supabase } from '@/lib/supabase';

export async function getSupplyChain360(days = 30) {
  const { data, error } = await supabase.rpc('get_supply_chain_360', { p_days: days });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export async function reconcileSupplyChain360() {
  const { data, error } = await supabase.rpc('reconcile_supply_chain_360');
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
