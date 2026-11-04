import { supabase } from '@/lib/supabase';

export type AutomationJobStatus = 'running' | 'succeeded' | 'failed' | 'timed_out' | 'skipped';

export interface AutomationJob {
  job_key: string;
  title: string;
  description: string;
  enabled: boolean;
  cron_expression: string;
  locked_until: string | null;
  active_run_id: string | null;
  active_status: AutomationJobStatus | null;
  active_started_at: string | null;
  active_finished_at: string | null;
  last_status: AutomationJobStatus | null;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_error: string | null;
  last_success_at: string | null;
}

export interface AutomationRun {
  id: string;
  job_key: string;
  status: AutomationJobStatus;
  trigger_source: string;
  started_at: string;
  finished_at: string | null;
  result: Record<string, unknown>;
  error_message: string | null;
}

export interface AutomationSchedulerHealth {
  cron_installed: boolean;
  net_installed: boolean;
  project_url_set: boolean;
  worker_secret_set: boolean;
  schedules_registered: number;
  expected_schedules: number;
  email_integration_enabled: boolean;
  queued_messages: number;
  oldest_queued_at: string | null;
  failed_messages_7d: number;
}

export interface AutomationSnapshot {
  days: number;
  generated_at: string;
  scheduler: AutomationSchedulerHealth;
  jobs: AutomationJob[];
  recent_runs: AutomationRun[];
}

export interface AutomationDispatchResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  request_id?: number;
}

export async function getAutomationOperations360(days = 7) {
  const { data, error } = await supabase.rpc('get_automation_operations_360', { p_days: days });
  if (error) throw error;
  return data as AutomationSnapshot;
}

export async function setAutomationJobEnabled(job: string, enabled: boolean) {
  const { error } = await supabase.rpc('set_automation_job_enabled', { p_job: job, p_enabled: enabled });
  if (error) throw error;
}

export async function runAutomationJobNow(job: string) {
  const { data, error } = await supabase.rpc('run_automation_job_now', { p_job: job });
  if (error) throw error;
  return data as AutomationDispatchResult;
}

export async function syncAutomationSchedule() {
  const { data, error } = await supabase.rpc('sync_automation_schedule');
  if (error) throw error;
  return data as { registered: number; cron_installed: boolean };
}
