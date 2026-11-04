import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Pause, Play, RefreshCw, TimerReset, XCircle, AlertTriangle } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { errorMessage } from '@/lib/db';
import {
  explainDispatch,
  getAutomationDispatchLog,
  getAutomationOperations360,
  runAutomationJobNow,
  setAutomationJobEnabled,
  syncAutomationSchedule,
  type AutomationDispatchLogEntry,
  type AutomationJob,
  type AutomationSnapshot,
} from '@/lib/automation-operations-360';

const when = (value: string | null) => (value ? new Date(value).toLocaleString() : 'Never');

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
      <span>
        {label}
        {!ok && hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </li>
  );
}

export default function AutomationOperations360() {
  const [data, setData] = useState<AutomationSnapshot | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [dispatchLog, setDispatchLog] = useState<AutomationDispatchLogEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setData(await getAutomationOperations360(days));
      setDispatchLog(await getAutomationDispatchLog().catch(() => []));
    } catch (e) {
      setMessage(errorMessage(e, 'Unable to load automation control.') ?? 'Unable to load automation control.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (key: string, work: () => Promise<string>) => {
    setBusy(key);
    setMessage('');
    setNotice('');
    try {
      setNotice(await work());
      await load();
    } catch (e) {
      setMessage(errorMessage(e, 'Action failed.') ?? 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const runNow = (job: AutomationJob) =>
    act(`run:${job.job_key}`, async () => {
      const result = await runAutomationJobNow(job.job_key);
      if (!result.ok) throw new Error(result.reason ?? 'Could not start the job.');
      // The database only queues the call; ask what the worker function answered so a wrong secret or a missing deploy is visible.
      if (typeof result.request_id === 'number') {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const [entry] = await getAutomationDispatchLog(result.request_id).catch(() => []);
          if (entry) {
            const verdict = explainDispatch(entry);
            if (!verdict.ok) throw new Error(verdict.text);
            return `${job.title}: ${verdict.text}`;
          }
        }
        return `${job.title} was sent but no answer was recorded yet. Refresh in a moment.`;
      }
      return `${job.title} was started.`;
    });

  const toggle = (job: AutomationJob) =>
    act(`toggle:${job.job_key}`, async () => {
      await setAutomationJobEnabled(job.job_key, !job.enabled);
      return `${job.title} ${job.enabled ? 'paused' : 'resumed'}.`;
    });

  const sync = () =>
    act('sync', async () => {
      const result = await syncAutomationSchedule();
      if (!result.cron_installed) throw new Error('pg_cron is not enabled on this project.');
      return `Schedule updated (${result.registered} active jobs).`;
    });

  const s = data?.scheduler;
  const healthy = !!s && s.cron_installed && s.net_installed && s.project_url_set && s.worker_secret_set && s.schedules_registered >= s.expected_schedules;

  return (
    <AdminLayout
      title="Automation & Worker Control 360"
      subtitle="Scheduled workers that send messages, release stock, check payments and remind customers about invoices."
      actions={
        <div className="flex gap-2">
          <select aria-label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm">
            <option value={1}>24 hours</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </button>
        </div>
      }
    >
      {message && <div className="mb-5 rounded-xl border bg-white p-4 text-sm text-destructive">{message}</div>}
      {notice && <div className="mb-5 rounded-xl border bg-white p-4 text-sm">{notice}</div>}

      {data && !data.scheduler && (
        <div className="mb-5 rounded-xl border bg-white p-4 text-sm">
          The database has not been updated for the new scheduler yet. Run <code>supabase db push</code>, then refresh this page.
        </div>
      )}

      {s && (
        <section className="mb-6 rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              {healthy ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
              {healthy ? 'Scheduler is running' : 'Scheduler needs attention'}
            </h2>
            <button onClick={() => void sync()} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <TimerReset className="h-4 w-4" />
              Re-sync schedule
            </button>
          </div>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            <Check ok={s.cron_installed} label="pg_cron is enabled" hint="Supabase Dashboard > Database > Extensions > enable pg_cron." />
            <Check ok={s.net_installed} label="pg_net is enabled" hint="Supabase Dashboard > Database > Extensions > enable pg_net." />
            <Check ok={s.project_url_set && s.worker_secret_set} label="Scheduler secrets are stored in Vault" hint="Run the one-time Vault SQL from docs/AUTOMATION-SCHEDULER.md." />
            <Check ok={s.schedules_registered >= s.expected_schedules} label={`Schedules registered (${s.schedules_registered}/${s.expected_schedules})`} hint="Press Re-sync schedule." />
            <Check ok={s.email_integration_enabled} label="Email integration is enabled" hint="Admin > Site Control > Communications Email: switch it on, otherwise messages stay queued." />
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            {s.queued_messages} message{s.queued_messages === 1 ? '' : 's'} waiting
            {s.oldest_queued_at ? `, oldest since ${when(s.oldest_queued_at)}` : ''} · {s.failed_messages_7d} failed in the last 7 days
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.scheduler && data.jobs.map((j) => (
          <div key={j.job_key} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{j.title}</p>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${j.enabled ? '' : 'text-muted-foreground'}`}>{j.enabled ? 'Active' : 'Paused'}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{j.description}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Last run: {j.last_status ?? 'never'}
              {j.active_status === 'running' ? ' (running now)' : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {when(j.last_started_at)} · last success {when(j.last_success_at)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Schedule: {j.cron_expression}</p>
            {j.last_error && <p className="mt-3 text-xs text-destructive">{j.last_error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => void runNow(j)} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm">
                <Play className="h-3.5 w-3.5" />
                Run now
              </button>
              <button onClick={() => void toggle(j)} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm">
                {j.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {j.enabled ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {dispatchLog.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Recent calls to the worker function</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dispatchLog.map((entry) => {
              const verdict = explainDispatch(entry);
              return (
                <li key={entry.id} className="flex items-start gap-2">
                  {verdict.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
                  <span>
                    {when(entry.created)} · {entry.status_code ?? 'no response'}
                    <span className="block text-xs text-muted-foreground">{verdict.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Recent execution history</h2>
        <div className="mt-4 space-y-3">
          {data?.recent_runs.length ? (
            data.recent_runs.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium capitalize">{r.job_key.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {when(r.started_at)} · {r.trigger_source}
                  </p>
                  {r.error_message && <p className="mt-1 text-xs text-destructive">{r.error_message}</p>}
                </div>
                <span className="inline-flex items-center gap-1 text-sm capitalize">
                  {r.status === 'succeeded' ? <CheckCircle2 className="h-4 w-4" /> : r.status === 'failed' ? <XCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                  {r.status}
                </span>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-muted-foreground">No worker runs have been recorded yet. Complete the checklist above, then press Run now on any job.</p>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
