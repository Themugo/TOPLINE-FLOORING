import { supabase } from '@/lib/supabase';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved';

export interface OperationalIncident {
  id: string;
  incident_number: number;
  severity: IncidentSeverity;
  status: IncidentStatus;
  domain: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  mitigated_at: string | null;
  resolved_at: string | null;
  resolution_summary: string | null;
}

export interface ReliabilitySnapshot {
  days: number;
  generated_at: string;
  metrics: {
    open: number;
    critical_open: number;
    high_open: number;
    resolved: number;
    detected_period: number;
    unassigned_open: number;
    oldest_open_hours: number;
  };
  open_incidents: OperationalIncident[];
}

export async function getReliabilityOperations360(days = 30) {
  const { data, error } = await supabase.rpc('get_reliability_operations_360', { p_days: days });
  if (error) throw error;
  return data as ReliabilitySnapshot;
}

export async function createOperationalIncident(input: { severity: IncidentSeverity; domain: string; title: string; description?: string; ownerId?: string }) {
  const { data, error } = await supabase.rpc('create_operational_incident', {
    p_severity: input.severity,
    p_domain: input.domain,
    p_title: input.title,
    p_description: input.description ?? null,
    p_owner_id: input.ownerId ?? null,
    p_metadata: {},
  });
  if (error) throw error;
  return data;
}

export async function updateOperationalIncident(input: { id: string; status: IncidentStatus; ownerId?: string; resolutionSummary?: string }) {
  const { data, error } = await supabase.rpc('update_operational_incident', {
    p_incident_id: input.id,
    p_status: input.status,
    p_owner_id: input.ownerId ?? null,
    p_resolution_summary: input.resolutionSummary ?? null,
  });
  if (error) throw error;
  return data;
}
