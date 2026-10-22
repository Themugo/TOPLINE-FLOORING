import { sql, rows, calls, reset, scenario, record, resetDb } from './lib.mjs';
const SC = 'http://127.0.0.1:8004/';
const run = (body, secret = 'e2e-worker-secret-value', hdr = 'x-topline-worker-secret') => fetch(SC, { method: 'POST', headers: { 'content-type': 'application/json', [hdr]: secret }, body: JSON.stringify(body) });
resetDb(); sql(`DELETE FROM public.automation_job_locks; DELETE FROM public.automation_job_runs;`); await reset(); await scenario({ email: 'ok' });
let r = await run({}, 'wrong');
record('SC-01', 'G/H', 'Scheduler rejects a wrong secret (401)', 'e2e-real-function', r.status === 401, r.status);
r = await fetch(SC, { method: 'POST', headers: { Authorization: 'Bearer e2e-worker-secret-value' }, body: '{}' });
record('SC-02', 'G', 'Scheduler accepts the secret as a Bearer token too', 'e2e-real-function', r.status === 200, r.status);
r = await run({ jobs: ['nonsense'] });
record('SC-03', 'G', 'Scheduler rejects an unsupported job request (400)', 'e2e-real-function', r.status === 400, r.status);

// full run: queued email is delivered by the scheduler -> worker chain
resetDb(); sql(`DELETE FROM public.automation_job_locks; DELETE FROM public.automation_job_runs;`); await reset();
sql(`INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key) VALUES ('email','sched@example.org','Hello','Body','sc-1');`);
r = await run({}); const j = await r.json();
const statuses = Object.fromEntries((j.results || []).map((x) => [x.job, x.status]));
record('SC-04', 'G', 'One scheduler call runs all four jobs and all succeed', 'e2e-real-function', r.status === 200 && Object.values(statuses).length === 4 && Object.values(statuses).every((s) => s === 'succeeded'), JSON.stringify(statuses));
record('SC-05', 'G', 'Scheduler -> worker chain delivered the queued email', 'e2e-real-function', (await calls()).filter((x) => x.to === 'sched@example.org').length === 1 && rows(`SELECT status FROM public.communication_outbox WHERE dedupe_key='sc-1'`)[0][0] === 'sent', JSON.stringify(rows(`SELECT status FROM public.communication_outbox WHERE dedupe_key='sc-1'`)));
const runs = rows(`SELECT job_key, status FROM public.automation_job_runs ORDER BY job_key`);
record('SC-06', 'G', 'Every job run is recorded with its outcome', 'e2e-db', runs.length === 4 && runs.every((x) => x[1] === 'succeeded'), JSON.stringify(runs));

// overlapping invocations: the second must skip, not double-process
resetDb(); sql(`DELETE FROM public.automation_job_locks; DELETE FROM public.automation_job_runs;`); await reset(); await scenario({ email: 'timeout_after_accept' });
sql(`INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key) VALUES ('email','hang@example.org','Hello','Body','sc-hang');`);
const first = run({ job: 'deliver_communications' }).then((x) => x.json());
await new Promise((res) => setTimeout(res, 2500));
const second = await (await run({ job: 'deliver_communications' })).json();
record('SC-07', 'G', 'Overlapping scheduler run is skipped while the first holds the lock (no double processing)', 'e2e-real-function', second.results?.[0]?.status === 'skipped' && second.results[0].reason === 'already_running', JSON.stringify(second.results));
const f = await first;
record('SC-08', 'G', 'The first run completes and releases the lock', 'e2e-real-function', f.results?.[0]?.status === 'succeeded' && rows(`SELECT count(*) FROM public.automation_job_runs WHERE status='running'`)[0][0] === '0', JSON.stringify(f.results?.[0]?.status));
await scenario({ email: 'ok' });

// crashed scheduler: lock left behind, expires, next run recovers and flags the dead run
resetDb(); sql(`DELETE FROM public.automation_job_locks; DELETE FROM public.automation_job_runs;`);
const dead = sql(`INSERT INTO public.automation_job_runs(job_key,status,trigger_source) VALUES ('deliver_communications','running','crashed') RETURNING id;`).split('\n')[0];
sql(`INSERT INTO public.automation_job_locks(job_key,run_id,locked_until,updated_at) VALUES ('deliver_communications','${dead}', now() - interval '1 minute', now() - interval '6 minutes');`);
sql(`INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key) VALUES ('email','recover@example.org','Hello','Body','sc-recover');`);
await reset(); const rec = await (await run({ job: 'deliver_communications' })).json();
const deadStatus = rows(`SELECT status FROM public.automation_job_runs WHERE id='${dead}'`)[0][0];
record('SC-09', 'G', 'Crashed scheduler: expired lock is recovered, dead run marked timed_out, queued mail still delivered', 'e2e-real-function', rec.results?.[0]?.status === 'succeeded' && deadStatus === 'timed_out' && (await calls()).filter((x) => x.to === 'recover@example.org').length === 1, JSON.stringify({ job: rec.results?.[0]?.status, deadRun: deadStatus }));
