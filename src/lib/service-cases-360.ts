import { supabase } from '@/lib/supabase';

export interface ServiceCaseRow360 {
  id: string;
  case_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  issue_title?: string | null;
  description?: string | null;
  priority?: string | null;
  sla_due_at?: string | null;
  type?: string | null;
  warranty_valid?: boolean | null;
  status: string;
  assigned_to?: string | null;
  [key: string]: unknown;
}

export interface ServiceCaseOperations360 {
  checked_at: string;
  cases: ServiceCaseRow360[];
  metrics: Record<string, number>;
  events: Array<Record<string, unknown>>;
  viewer: string;
}

export async function getServiceCaseOperations360(caseId?: string) {
  const { data, error } = await supabase.rpc('get_service_case_operations_360', { p_case_id: caseId || null });
  if (error) throw error;
  return data as ServiceCaseOperations360;
}

export async function transitionServiceCase360(input: { id: string; status: string; priority?: string; assignedTo?: string | null; scheduledDate?: string | null; resolution?: string | null; note?: string | null }) {
  const { data, error } = await supabase.rpc('transition_service_case_360', {
    p_case_id: input.id,
    p_status: input.status,
    p_priority: input.priority || null,
    p_assigned_to: input.assignedTo || null,
    p_scheduled_date: input.scheduledDate || null,
    p_resolution: input.resolution || null,
    p_note: input.note || null,
  });
  if (error) throw error;
  return data;
}
