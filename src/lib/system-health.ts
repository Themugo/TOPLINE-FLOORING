import { supabase } from '@/lib/supabase';

export interface SystemHealthSnapshot {
  checked_at: string;
  database: { status: string; server_time: string };
  staff: { active_count: number };
  customers: { count: number };
  orders: { open_count: number };
  projects: { active_count: number };
  inventory: { low_stock_alerts: number };
  communications: { queued: number; failed: number };
  tables: Record<string, boolean>;
}

export async function getSystemHealthSnapshot() {
  const { data, error } = await supabase.rpc('get_system_health_snapshot');
  if (error) throw error;
  return data as SystemHealthSnapshot;
}
