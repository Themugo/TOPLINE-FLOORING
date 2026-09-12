import { supabase } from '@/lib/supabase';

export type ProjectDelivery360 = {
  success: boolean;
  project_count: number;
  projects: Array<Record<string, unknown>>;
};

export async function getProjectDelivery360(projectId?: string | null): Promise<ProjectDelivery360> {
  const { data, error } = await supabase.rpc('get_project_delivery_360', { p_project_id: projectId || null });
  if (error) throw error;
  return data as ProjectDelivery360;
}

export async function reconcileProjectDelivery360(projectId?: string | null) {
  const { data, error } = await supabase.rpc('reconcile_project_delivery_360', { p_project_id: projectId || null });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function recordProjectQualityInspection(input: {
  projectId: string;
  installationId?: string | null;
  status: 'pending' | 'passed' | 'failed' | 'waived';
  score?: number | null;
  findings?: string | null;
  correctiveAction?: string | null;
  inspectionType?: string;
}) {
  const { data, error } = await supabase.rpc('record_project_quality_inspection', {
    p_project_id: input.projectId,
    p_installation_id: input.installationId || null,
    p_status: input.status,
    p_score: input.score ?? null,
    p_findings: input.findings || null,
    p_corrective_action: input.correctiveAction || null,
    p_inspection_type: input.inspectionType || 'final',
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function updateProjectDeliveryStatus(projectId: string, status: string, notes?: string) {
  const { data, error } = await supabase.rpc('update_project_delivery_status', {
    p_project_id: projectId,
    p_status: status,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}
