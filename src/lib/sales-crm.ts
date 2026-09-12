import { supabase } from '@/lib/supabase';

export interface SalesCrmSnapshot {
  leads: number; qualified_leads: number; pipeline_value: number; overdue_follow_ups: number;
  open_quotes: number; quote_value: number; accepted_quotes: number; open_tasks: number;
  overdue_tasks: number; won_leads: number; lost_leads: number;
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function transitionLeadStatus(leadId: string, status: string, reason?: string) {
  return rpc('transition_lead_status', { p_lead_id: leadId, p_status: status, p_reason: reason || null });
}
export async function addLeadActivity(leadId: string, type: string, subject?: string, content?: string) {
  return rpc('add_lead_activity', { p_lead_id: leadId, p_activity_type: type, p_subject: subject || null, p_content: content || null });
}
export async function createSalesTask(input: { title: string; dueAt: string; leadId?: string; customerId?: string; quotationId?: string; assignedTo?: string; notes?: string }) {
  return rpc('create_sales_task', { p_title: input.title, p_due_at: input.dueAt, p_lead_id: input.leadId || null, p_customer_id: input.customerId || null, p_quotation_id: input.quotationId || null, p_assigned_to: input.assignedTo || null, p_notes: input.notes || null });
}
export async function completeSalesTask(taskId: string) { return rpc('complete_sales_task', { p_task_id: taskId }); }
export async function transitionQuotationStatus(quotationId: string, status: string, reason?: string) { return rpc('transition_quotation_status', { p_quotation_id: quotationId, p_status: status, p_reason: reason || null }); }
export async function getSalesCrm360(): Promise<SalesCrmSnapshot> { return (await rpc('get_sales_crm_360', {})) as unknown as SalesCrmSnapshot; }
