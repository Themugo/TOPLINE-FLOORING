# G-07 — Background automation and communication worker UAT

**Scope:** Prove that the hosted Supabase scheduler dispatches jobs, the `operations-scheduler` Edge Function authenticates the dispatch, the selected job executes, and the communication worker sends queued test messages. This runbook is for an isolated staging project only.

**Safety:** Do not use production orders, production customer addresses, production credentials or a production database for this UAT. Never commit, paste into chat, or include in evidence the service-role key, `TOPLINE_WORKER_SECRET`, Brevo API key, or decrypted Vault values. Redact recipient addresses and provider payloads from shared logs.

## 1. Staging prerequisites

1. Confirm the linked project is the dedicated Topline staging/Supabase project and record its project ref in the UAT evidence.
2. Confirm the migrations that create `automation_job_settings`, `automation_job_runs`, `automation_job_locks`, the dispatcher and diagnostics have been applied to staging through the approved deployment process. Do not use `db push` as part of this test without separate approval.
3. Deploy the current `operations-scheduler` and `deliver-communications` Edge Functions to staging.
4. Set server-side Edge Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOPLINE_WORKER_SECRET`, `BREVO_API_KEY`, and `BREVO_SENDER_EMAIL`. Set the same random high-entropy worker secret in Supabase Vault as `topline_worker_secret`; set `topline_project_url` in Vault to the staging project URL. Never output decrypted values.
5. Enable `pg_cron`, `pg_net`, and Vault in the staging database. Ensure the project has outbound network access for `pg_net` and the Edge Functions.
6. Enable the email integration and use a controlled mailbox address approved for testing. Ensure SMS/WhatsApp are disabled unless separately included in the test plan.

## 2. Confirm scheduler registration (read-only SQL)

Run in the staging SQL editor. This returns job names and schedules, not secret values:

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname like 'topline-%'
order by jobname;
```

Expected: five active `topline-*` jobs matching the enabled rows in `public.automation_job_settings`. The expected cadence is one-minute delivery, five-minute communication reconciliation, five-minute reservation expiry, 15-minute payment reconciliation, and daily invoice reminders. Supabase cron uses the database's configured timezone; verify that the daily invoice schedule corresponds to the documented Nairobi business time before relying on it.

Confirm extensions without exposing secrets:

```sql
select extname from pg_extension where extname in ('pg_cron','pg_net','supabase_vault') order by extname;
select name from vault.secrets where name in ('topline_project_url','topline_worker_secret') order by name;
```

Expected: required extensions and both Vault secret *names* exist. Do not select `decrypted_secret`.

## 3. Prove scheduler dispatch

Use Admin → Automation → **Re-sync schedule**, then **Run now** for `Send queued messages`. The UI must show a request/dispatch result, not just an optimistic “started” toast.

Inspect recent HTTP dispatch responses (redact content before sharing):

```sql
select id, status_code, timed_out, error_msg, created
from net._http_response
order by id desc
limit 20;
```

Expected: a recent HTTP 2xx response from `operations-scheduler`. A 401 means the Vault worker secret and Edge Function secret do not match; 404 means the function is not deployed at the expected project; timeout/network errors require checking `pg_net` and outbound access. Do not expose response bodies that could contain sensitive information.

## 4. Prove worker execution and lock lifecycle

```sql
select id, job_key, status, trigger_source, started_at, finished_at,
       result, error_message
from public.automation_job_runs
where started_at > now() - interval '2 hours'
order by started_at desc
limit 100;

select job_key, run_id, locked_until, updated_at
from public.automation_job_locks
order by job_key;
```

Expected: the manually invoked job has a run row with a `manual:` trigger source; cron runs have `pg_cron` in their trigger source. Completed jobs have `succeeded` or an honestly recorded `failed` status and a finish timestamp. A completed run must not retain its matching lock. A currently running job may retain a lock until completion/timeout. Repeated invocation while a valid lock is held should return `already_running`, not create overlapping work.

Allow at least two scheduled intervals and verify new `pg_cron` dispatches and corresponding `automation_job_runs` appear without manual invocation. Capture timestamps and the run IDs.

## 5. Prove an actual communication send

1. Create one disposable staging order or enqueue one approved test email through the existing staging workflow. Use a controlled mailbox, not a real customer.
2. Record the outbox row ID, dedupe key (redacted if it embeds personal data), channel, queue timestamp and initial status.
3. Trigger the `deliver_communications` job through Admin → Automation → Run now, or wait for the one-minute schedule.
4. Confirm the matching communication outbox row advances from queued to the provider-accepted/delivered lifecycle, has a provider message ID, and has a delivery attempt record.
5. Confirm the controlled mailbox actually receives the email.
6. Confirm the provider delivery webhook updates that same message/outbox record to `delivered`. Provider API acceptance alone is not inbox receipt.
7. Run the same job again and confirm the dedupe/idempotency protections do not send a second copy.

Use the G-06 runbook and G-06 evidence for the detailed provider callback and mailbox proof. G-07 additionally requires that the worker was invoked by the scheduler and recorded as a successful automation run.

## 6. Failure and recovery checks

On staging only, perform controlled checks with disposable messages:

- Temporarily use an invalid test sender/provider configuration, confirm the job records failure and does not mark a message delivered, then restore valid secrets.
- Confirm a duplicate run while the lock is active is skipped and no second provider send occurs.
- Confirm a timed-out/expired lock is reconciled and a subsequent run can proceed.
- Confirm paused jobs stop receiving cron dispatches, while an explicitly authorized Run now behaves according to the admin control contract.
- Confirm the dispatch diagnostics distinguish HTTP failure from a successful scheduler invocation.

Do not intentionally break shared production credentials or send repeated paid SMS/WhatsApp tests.

## 7. Evidence required for G-07 closure

Attach to the G-07 evidence bundle:

- Staging project ref, deployed function versions and migration head.
- Sanitized `cron.job` output showing all five expected active schedules.
- Vault secret-name check only (never secret values).
- Sanitized `net._http_response` rows showing scheduler HTTP 2xx.
- `automation_job_runs` rows showing cron and manual execution, start/end timestamps, result and status.
- Evidence that locks are released after completion and overlap is prevented.
- One real scheduled communication-worker run tied to an outbox ID and provider message ID.
- Controlled mailbox receipt and provider delivery callback confirming `delivered` (cross-reference G-06).
- Failure/recovery results and operator sign-off.

G-07 remains OPEN until these live staging artifacts exist. Static CI assertions and a green source verifier are not proof of hosted scheduler execution.
