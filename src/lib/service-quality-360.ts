import { supabase } from '@/lib/supabase';

export interface ServiceQuality360 {
  checked_at: string;
  metrics: Record<string, number>;
  feedback: Array<Record<string, unknown>>;
  viewer: string;
}

export async function getServiceCaseQuality360() {
  const { data, error } = await supabase.rpc('get_service_case_quality_360');
  if (error) throw error;
  return data as ServiceQuality360;
}

export async function reconcileServiceCaseSlas360() {
  const { data, error } = await supabase.rpc('reconcile_service_case_slas_360');
  if (error) throw error;
  return data;
}

export async function refreshServiceCaseWarranty360(caseId: string) {
  const { data, error } = await supabase.rpc('refresh_service_case_warranty_360', { p_case_id: caseId });
  if (error) throw error;
  return data;
}

export async function submitServiceCaseFeedback(caseId: string, rating: number, comment?: string) {
  const { data, error } = await supabase.rpc('submit_service_case_feedback', {
    p_case_id: caseId,
    p_rating: rating,
    p_comment: comment?.trim() || null,
  });
  if (error) throw error;
  return data;
}
