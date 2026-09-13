import { supabase } from '@/lib/supabase';

export type AutomationJobStatus = 'running' | 'succeeded' | 'failed' | 'timed_out' | 'skipped';
export interface AutomationJob { job_key: string; locked_until: string | null; active_run_id: string | null; active_status: AutomationJobStatus | null; active_started_at: string | null; active_finished_at: string | null; last_status: AutomationJobStatus | null; last_started_at: string | null; last_finished_at: string | null; last_error: string | null; }
export interface AutomationRun { id: string; job_key: string; status: AutomationJobStatus; trigger_source: string; started_at: string; finished_at: string | null; result: Record<string, unknown>; error_message: string | null; }
export interface AutomationSnapshot { days: number; generated_at: string; jobs: AutomationJob[]; recent_runs: AutomationRun[]; }

export async function getAutomationOperations360(days = 7) {
  const { data, error } = await supabase.rpc('get_automation_operations_360', { p_days: days });
  if (error) throw error;
  return data as AutomationSnapshot;
}
