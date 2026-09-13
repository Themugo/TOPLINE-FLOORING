import { supabase } from '@/lib/supabase';

export type ThemeGovernanceSnapshot = Record<string, unknown>;
export interface ThemeRevision { id: string; version: number; snapshot: ThemeGovernanceSnapshot; change_reason: string | null; created_at: string; created_by: string | null; }

export async function getThemeGovernance360() {
  const { data, error } = await supabase.rpc('get_theme_governance_360');
  if (error) throw error;
  return data as { theme: ThemeGovernanceSnapshot | null; revisions: ThemeRevision[] };
}

export async function publishThemeSettings(theme: ThemeGovernanceSnapshot, reason?: string) {
  const { data, error } = await supabase.rpc('publish_theme_settings', { p_theme: theme, p_reason: reason || null });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function rollbackThemeSettings(revisionId: string, reason?: string) {
  const { data, error } = await supabase.rpc('rollback_theme_settings', { p_revision_id: revisionId, p_reason: reason || null });
  if (error) throw error;
  return data as Record<string, unknown>;
}
