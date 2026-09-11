import { supabase } from '@/lib/supabase';

export type CostCategory = 'materials'|'labor'|'equipment'|'transport'|'subcontractor'|'permits'|'other';
export async function addProjectCostEntry(input: { projectId: string; category: CostCategory; description: string; estimatedAmount: number; actualAmount: number; incurredAt?: string; referenceType?: string | null; referenceId?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('add_project_cost_entry', { p_project_id: input.projectId, p_category: input.category, p_description: input.description, p_estimated_amount: input.estimatedAmount, p_actual_amount: input.actualAmount, p_incurred_at: input.incurredAt || null, p_reference_type: input.referenceType || null, p_reference_id: input.referenceId || null, p_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function updateProjectCostEntry(input: { id: string; category: CostCategory; description: string; estimatedAmount: number; actualAmount: number; incurredAt?: string; notes?: string | null }) {
  const { data, error } = await supabase.rpc('update_project_cost_entry', { p_entry_id: input.id, p_category: input.category, p_description: input.description, p_estimated_amount: input.estimatedAmount, p_actual_amount: input.actualAmount, p_incurred_at: input.incurredAt || null, p_notes: input.notes || null });
  if (error) throw error; return data;
}
export async function deleteProjectCostEntry(id: string) { const { data, error } = await supabase.rpc('delete_project_cost_entry', { p_entry_id: id }); if (error) throw error; return data; }
