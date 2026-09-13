import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const workerSecret = Deno.env.get('TOPLINE_WORKER_SECRET');
if (!supabaseUrl || !serviceRoleKey || !workerSecret) throw new Error('Operations scheduler is not configured');

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const jobs = ['expire_inventory_reservations','reconcile_payment_provider_events','reconcile_communications'] as const;
type Job = typeof jobs[number];

function authorized(req: Request) {
  const direct = req.headers.get('x-topline-worker-secret');
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return direct === workerSecret || bearer === workerSecret;
}

async function runJob(job: Job) {
  const started = await supabase.rpc('start_automation_job', { p_job_key: job, p_lock_seconds: 300, p_trigger_source: 'operations-scheduler' });
  if (started.error) throw started.error;
  const lock = started.data as { acquired: boolean; run_id?: string; locked_until?: string };
  if (!lock.acquired || !lock.run_id) return { job, status: 'skipped', reason: 'already_running', run_id: lock.run_id ?? null };

  try {
    let result: unknown;
    if (job === 'expire_inventory_reservations') {
      const response = await supabase.rpc('expire_inventory_reservations');
      if (response.error) throw response.error;
      result = { expired: response.data };
    } else if (job === 'reconcile_payment_provider_events') {
      const response = await supabase.rpc('reconcile_payment_provider_events', { p_since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });
      if (response.error) throw response.error;
      result = response.data;
    } else {
      const response = await supabase.rpc('reconcile_communications_worker_360');
      if (response.error) throw response.error;
      result = response.data;
    }
    const finished = await supabase.rpc('finish_automation_job', { p_run_id: lock.run_id, p_status: 'succeeded', p_result: result ?? {} });
    if (finished.error) throw finished.error;
    return { job, status: 'succeeded', run_id: lock.run_id, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker failed';
    await supabase.rpc('finish_automation_job', { p_run_id: lock.run_id, p_status: 'failed', p_result: {}, p_error_message: message });
    return { job, status: 'failed', run_id: lock.run_id, error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  const body = await req.text();
  if (body.length > 16384) return new Response('Payload Too Large', { status: 413 });
  let requested: Job[] = [...jobs];
  if (body.trim()) {
    try {
      const parsed = JSON.parse(body) as { job?: string; jobs?: string[] };
      const candidate = parsed.job ? [parsed.job] : parsed.jobs ?? [...jobs];
      requested = candidate.filter((value): value is Job => jobs.includes(value as Job));
      if (!requested.length) return Response.json({ success: false, error: 'No supported jobs requested' }, { status: 400 });
    } catch { return Response.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 }); }
  }
  const results = [];
  for (const job of requested) results.push(await runJob(job));
  const failed = results.filter((r) => r.status === 'failed').length;
  return Response.json({ success: failed === 0, processed_at: new Date().toISOString(), results }, { status: failed ? 500 : 200 });
});
