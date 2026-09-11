import { supabase } from '@/lib/supabase';
export async function createServiceCase(input: { customerId: string; issueTitle: string; description: string; type?: string; priority?: string; projectId?: string | null; orderId?: string | null }) {
  const { data, error } = await supabase.rpc('create_service_case', { p_customer_id: input.customerId, p_issue_title: input.issueTitle, p_description: input.description, p_type: input.type || 'warranty', p_priority: input.priority || 'medium', p_project_id: input.projectId || null, p_order_id: input.orderId || null });
  if (error) throw error; return data;
}
export async function updateServiceCase(input: { id: string; status: string; priority?: string; assignedTo?: string | null; scheduledDate?: string | null; resolution?: string | null }) {
  const { data, error } = await supabase.rpc('update_service_case', { p_case_id: input.id, p_status: input.status, p_priority: input.priority || null, p_assigned_to: input.assignedTo || null, p_scheduled_date: input.scheduledDate || null, p_resolution: input.resolution || null });
  if (error) throw error; return data;
}
