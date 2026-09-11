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
