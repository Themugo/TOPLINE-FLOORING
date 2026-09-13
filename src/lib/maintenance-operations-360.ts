import { supabase } from '@/lib/supabase';
import type { RpcResult } from '@/lib/types';

export async function getMaintenanceOperations360() {
  const { data, error } = await supabase.rpc('get_maintenance_operations_360');
  if (error) throw error;
  return data as RpcResult;
}

export async function createMaintenancePlan360(input: { customerId: string; name: string; frequencyMonths: number; startsOn: string; projectId?: string | null; orderId?: string | null; description?: string | null; expiresOn?: string | null; notes?: string | null }) {
  const { data, error } = await supabase.rpc('create_maintenance_plan_360', { p_customer_id: input.customerId, p_name: input.name, p_frequency_months: input.frequencyMonths, p_starts_on: input.startsOn, p_project_id: input.projectId ?? null, p_order_id: input.orderId ?? null, p_description: input.description ?? null, p_expires_on: input.expiresOn ?? null, p_notes: input.notes ?? null });
  if (error) throw error;
  return data as RpcResult;
}

export async function scheduleMaintenanceVisit360(planId: string, scheduledFor: string, assignedTo?: string | null, notes?: string | null) {
  const { data, error } = await supabase.rpc('schedule_maintenance_visit_360', { p_plan_id: planId, p_scheduled_for: scheduledFor, p_assigned_to: assignedTo ?? null, p_notes: notes ?? null });
  if (error) throw error;
  return data as RpcResult;
}

export async function completeMaintenanceVisit360(visitId: string, completedOn?: string, notes?: string | null) {
  const { data, error } = await supabase.rpc('complete_maintenance_visit_360', { p_visit_id: visitId, p_completed_on: completedOn ?? new Date().toISOString().slice(0, 10), p_notes: notes ?? null });
  if (error) throw error;
  return data as RpcResult;
}

export async function transitionMaintenancePlan360(planId: string, status: string, notes?: string | null) {
  const { data, error } = await supabase.rpc('transition_maintenance_plan_360', { p_plan_id: planId, p_status: status, p_notes: notes ?? null });
  if (error) throw error;
  return data as RpcResult;
}

export async function getCustomerMaintenancePlans360() {
  const { data, error } = await supabase.rpc('get_customer_maintenance_plans_360');
  if (error) throw error;
  return data as RpcResult;
}
