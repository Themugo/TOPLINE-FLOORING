import { supabase } from '@/lib/supabase';

export async function transitionInvoiceLifecycle(invoiceId: string, status: string, note?: string) {
  const { data, error } = await supabase.rpc('transition_invoice_lifecycle', { p_invoice_id: invoiceId, p_status: status, p_note: note || null });
  if (error) throw error;
  return data as { success?: boolean; invoice_id?: string; status?: string; unchanged?: boolean };
}

export async function refreshInvoiceLifecycleStatuses() {
  const { data, error } = await supabase.rpc('refresh_invoice_lifecycle_statuses');
  if (error) throw error;
  return data as { success?: boolean; updated_count?: number };
}

export async function getFinanceOperations360(days = 30) {
  const { data, error } = await supabase.rpc('get_finance_operations_360', { p_days: days });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}
