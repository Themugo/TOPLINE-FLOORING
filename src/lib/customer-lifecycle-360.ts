import { supabase } from '@/lib/supabase';
import type { RpcResult } from '@/lib/types';

export async function getCustomerLifecycleOperations360() {
  const { data, error } = await supabase.rpc('get_customer_lifecycle_operations_360');
  if (error) throw error;
  return data as RpcResult;
}

export async function getCustomerLifecycle360(customerId?: string | null) {
  const { data, error } = await supabase.rpc('get_customer_lifecycle_360', { p_customer_id: customerId ?? null });
  if (error) throw error;
  return data as RpcResult;
}

export async function reconcileCustomerLifecycle360() {
  const { data, error } = await supabase.rpc('reconcile_customer_lifecycle_360');
  if (error) throw error;
  return data as RpcResult;
}
