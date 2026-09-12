import { supabase } from '@/lib/supabase';

export interface ExecutiveSnapshot {
  days: number;
  generated_at: string;
  metrics: Record<string, number>;
  exceptions: Array<{ priority: string; domain: string; label: string; count: number }>;
  priorities: { critical: number; high: number; medium: number };
}

export async function getExecutiveOperations360(days = 30): Promise<ExecutiveSnapshot> {
  const { data, error } = await supabase.rpc('get_executive_operations_360', { p_days: days });
  if (error) throw error;
  return data as ExecutiveSnapshot;
}

export async function reconcileExecutiveOperations360() {
  const { data, error } = await supabase.rpc('reconcile_executive_operations_360');
  if (error) throw error;
  return data;
}
