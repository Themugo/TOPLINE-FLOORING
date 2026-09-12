import { supabase } from '@/lib/supabase';

export interface LifecycleResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

async function callLifecycle(functionName: string, args: Record<string, unknown>): Promise<LifecycleResult> {
  const { data, error } = await supabase.rpc(functionName, args);
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('Lifecycle operation returned an invalid response');
  return data as LifecycleResult;
}

export function convertLeadToCustomer(leadId: string) {
  return callLifecycle('convert_lead_to_customer', { p_lead_id: leadId });
}

export function convertQuotationToOrder(quotationId: string, projectTitle?: string) {
  return callLifecycle('convert_quotation_to_order', {
    p_quotation_id: quotationId,
    p_project_title: projectTitle || null,
  });
}

export function createSiteVisit(input: {
  quotationId?: string | null;
  customerId?: string | null;
  scheduledDate: string;
  scheduledTime?: string | null;
  visitType?: string;
  assignedTo?: string | null;
  notes?: string | null;
}) {
  return callLifecycle('create_site_visit', {
    p_quotation_id: input.quotationId || null,
    p_customer_id: input.customerId || null,
    p_scheduled_date: input.scheduledDate,
    p_scheduled_time: input.scheduledTime || null,
    p_visit_type: input.visitType || 'site_survey',
    p_assigned_to: input.assignedTo || null,
    p_visit_notes: input.notes || null,
  });
}

export function updateSiteVisitStatus(visitId: string, status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled', notes?: string) {
  return callLifecycle('update_site_visit_status', {
    p_visit_id: visitId,
    p_status: status,
    p_visit_notes: notes || null,
  });
}

export function updateProjectProgress(projectId: string, progress: number, status?: string, notes?: string) {
  return callLifecycle('update_project_progress', { p_project_id: projectId, p_progress: progress, p_status: status || null, p_notes: notes || null });
}
export async function createProjectTask(projectId: string, title: string, description?: string, dueDate?: string, assignedTo?: string) {
  const { data, error } = await supabase.rpc('create_project_task', { p_project_id: projectId, p_title: title, p_description: description || null, p_due_date: dueDate || null, p_assigned_to: assignedTo || null });
  if (error) throw error; return data as string;
}
export function updateProjectTask(taskId: string, status: string, notes?: string) { return callLifecycle('update_project_task', { p_task_id: taskId, p_status: status, p_notes: notes || null }); }
export function allocateProjectMaterial(projectId: string, productId: string, warehouseId: string, quantity: number, notes?: string) { return callLifecycle('allocate_project_material', { p_project_id: projectId, p_product_id: productId, p_warehouse_id: warehouseId, p_quantity: quantity, p_notes: notes || null }); }
export async function createProjectIssue(projectId: string, title: string, description?: string, severity?: string, assignedTo?: string) { const { data, error } = await supabase.rpc('create_project_issue', { p_project_id: projectId, p_title: title, p_description: description || null, p_severity: severity || 'medium', p_assigned_to: assignedTo || null }); if (error) throw error; return data as string; }
export function resolveProjectIssue(issueId: string, status: string, resolution?: string) { return callLifecycle('resolve_project_issue', { p_issue_id: issueId, p_status: status, p_resolution: resolution || null }); }
export function completeProjectWithSignoff(projectId: string, approved: boolean, customerName?: string, signature?: string, notes?: string) { return callLifecycle('complete_project_with_signoff', { p_project_id: projectId, p_approved: approved, p_customer_name: customerName || null, p_signature: signature || null, p_notes: notes || null }); }

export function scheduleProjectInstallation(projectId: string, orderId: string | null, scheduledDate: string, scheduledTime?: string | null, assignedTeam?: unknown[], notes?: string) { return callLifecycle('schedule_project_installation', { p_project_id: projectId, p_order_id: orderId || null, p_scheduled_date: scheduledDate, p_scheduled_time: scheduledTime || null, p_assigned_team: assignedTeam || [], p_notes: notes || null }); }

export async function recordProjectMeasurement(projectId: string, label: string, value: number, unit?: string, notes?: string) { const { data, error } = await supabase.rpc('record_project_measurement', { p_project_id: projectId, p_label: label, p_value: value, p_unit: unit || 'm²', p_notes: notes || null }); if (error) throw error; return data as string; }

export function createLeadTransaction(input: {
  name: string; email?: string | null; phone?: string | null; company?: string | null;
  source?: string; status?: string; estimatedValue?: number | null; projectLocation?: string | null;
  projectAddress?: string | null; notes?: string | null; assignedTo?: string | null;
  followUpDate?: string | null; followUpNotes?: string | null;
}) {
  return callLifecycle('create_lead_transaction', {
    p_name: input.name, p_email: input.email || null, p_phone: input.phone || null,
    p_company: input.company || null, p_source: input.source || 'manual', p_status: input.status || 'new',
    p_estimated_value: input.estimatedValue ?? null, p_project_location: input.projectLocation || null,
    p_project_address: input.projectAddress || null, p_notes: input.notes || null,
    p_assigned_to: input.assignedTo || null, p_follow_up_date: input.followUpDate || null,
    p_follow_up_notes: input.followUpNotes || null,
  });
}

export function updateLeadTransaction(leadId: string, input: Record<string, unknown>) {
  return callLifecycle('update_lead_transaction', {
    p_lead_id: leadId,
    p_name: input.name ?? null, p_email: input.email ?? null, p_phone: input.phone ?? null,
    p_company: input.company ?? null, p_source: input.source ?? null, p_status: input.status ?? null,
    p_estimated_value: input.estimatedValue ?? input.estimated_value ?? null,
    p_project_location: input.projectLocation ?? input.project_location ?? null,
    p_project_address: input.projectAddress ?? input.project_address ?? null,
    p_notes: input.notes ?? null, p_assigned_to: input.assignedTo ?? input.assigned_to ?? null,
    p_follow_up_date: input.followUpDate ?? input.follow_up_date ?? null,
    p_follow_up_notes: input.followUpNotes ?? input.follow_up_notes ?? null,
    p_lost_reason: input.lostReason ?? input.lost_reason ?? null,
    p_outcome: input.outcome ?? null, p_outcome_reason: input.outcomeReason ?? input.outcome_reason ?? null,
  });
}

export function deleteLeadTransaction(leadId: string) {
  return callLifecycle('delete_lead_transaction', { p_lead_id: leadId });
}

export function createLeadFromQuotation(quotationId: string) {
  return callLifecycle('create_lead_from_quotation', { p_quotation_id: quotationId });
}

export function upsertQuotationItem(input: { quotationId: string; itemId?: string | null; description: string; quantity: number; unit: string; unitPrice: number; productId?: string | null }) {
  return callLifecycle('upsert_quotation_item_transaction', {
    p_quotation_id: input.quotationId, p_item_id: input.itemId || null, p_description: input.description,
    p_quantity: input.quantity, p_unit: input.unit, p_unit_price: input.unitPrice, p_product_id: input.productId || null,
  });
}

export function removeQuotationItem(itemId: string) {
  return callLifecycle('remove_quotation_item_transaction', { p_item_id: itemId });
}

export async function getCommercialLifecycle360() {
  const { data, error } = await supabase.rpc('get_commercial_lifecycle_360');
  if (error) throw error;
  return data as Record<string, unknown>;
}
