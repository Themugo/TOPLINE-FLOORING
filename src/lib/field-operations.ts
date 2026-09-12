import { supabase } from '@/lib/supabase';

export async function assignInstallationStaff(input: { installationId: string; staffUserId: string; role?: string; start?: string | null; end?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('assign_installation_staff', { p_installation_id: input.installationId, p_staff_user_id: input.staffUserId, p_assignment_role: input.role || 'installer', p_scheduled_start: input.start || null, p_scheduled_end: input.end || null, p_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function updateInstallationStatus(installationId: string, status: string, notes?: string | null) {
  const { data, error } = await supabase.rpc('update_installation_status', { p_installation_id: installationId, p_status: status, p_notes: notes || null });
  if (error) throw error; return data;
}
export async function removeInstallationAssignment(assignmentId: string) {
  const { data, error } = await supabase.rpc('remove_installation_assignment', { p_assignment_id: assignmentId });
  if (error) throw error; return data;
}
export async function recordInstallationMeasurement(input: { installationId: string; surfaceName: string; length?: number | null; width?: number | null; depth?: number | null; area?: number | null; unit?: string; siteVisitId?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('record_installation_measurement', { p_installation_id: input.installationId, p_surface_name: input.surfaceName, p_length: input.length ?? null, p_width: input.width ?? null, p_depth: input.depth ?? null, p_area: input.area ?? null, p_unit: input.unit || 'sqm', p_site_visit_id: input.siteVisitId || null, p_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function allocateInstallationMaterial(input: { installationId: string; productId: string; quantity: number; unit?: string; notes?: string | null }) {
  const { data, error } = await supabase.rpc('allocate_installation_material', { p_installation_id: input.installationId, p_product_id: input.productId, p_quantity: input.quantity, p_unit: input.unit || 'sqm', p_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function updateInstallationMaterialAllocation(allocationId: string, status: string, notes?: string | null) {
  const { data, error } = await supabase.rpc('update_installation_material_allocation', { p_allocation_id: allocationId, p_status: status, p_notes: notes || null });
  if (error) throw error; return data;
}
export async function recordInstallationProgress(input: { installationId: string; percentComplete: number; workSummary: string; blockers?: string | null }) {
  const { data, error } = await supabase.rpc('record_installation_progress', { p_installation_id: input.installationId, p_percent_complete: input.percentComplete, p_work_summary: input.workSummary, p_blockers: input.blockers || null });
  if (error) throw error; return data;
}
export async function reportInstallationIssue(input: { installationId: string; severity: string; category: string; description: string }) {
  const { data, error } = await supabase.rpc('report_installation_issue', { p_installation_id: input.installationId, p_severity: input.severity, p_category: input.category, p_description: input.description });
  if (error) throw error; return data;
}
export async function resolveInstallationIssue(issueId: string, status: string, resolutionNotes?: string | null) {
  const { data, error } = await supabase.rpc('resolve_installation_issue', { p_issue_id: issueId, p_status: status, p_resolution_notes: resolutionNotes || null });
  if (error) throw error; return data;
}
export async function signoffInstallation(input: { installationId: string; signedByName: string; signerRole?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('signoff_installation', { p_installation_id: input.installationId, p_signed_by_name: input.signedByName, p_signer_role: input.signerRole || null, p_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function getInstallationOperations360(installationId: string) {
  const { data, error } = await supabase.rpc('get_installation_operations_360', { p_installation_id: installationId });
  if (error) throw error; return data;
}
