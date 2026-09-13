# Operation 17 — Production Automation & Worker Control 360

## Objective

Provide a durable, service-role-only control plane for recurring Topline operational workers without putting provider credentials or privileged mutations in the browser.

## Worker jobs

1. `expire_inventory_reservations` — expires stale checkout reservations through the existing canonical lifecycle function.
2. `reconcile_payment_provider_events` — produces a 24-hour payment-provider/order reconciliation snapshot.
3. `reconcile_communications` — releases stale communication locks and reports exhausted/unmatched communication conditions.

## Control model

Each run creates an immutable-style execution record in `automation_job_runs`. A per-job row in `automation_job_locks` prevents overlapping workers. Expired locks mark the previous run `timed_out` before a new run is admitted. Completion releases the lock only for the matching run ID.

The scheduler accepts only `TOPLINE_WORKER_SECRET` and uses the Supabase service role internally. No service-role credential is exposed to the frontend. Supported job names are allow-listed.

## Scheduling

The Edge Function is intentionally prepared for Supabase scheduled invocation or an external scheduler controlled by the client. Source deployment alone does not claim that a schedule is active. The production operator must deploy `operations-scheduler`, configure `TOPLINE_WORKER_SECRET`, and create the desired schedule in the client-owned Supabase project.

Recommended cadence:

- reservation expiry: every 5 minutes
- communication reconciliation: every 10 minutes
- payment-provider reconciliation: every 15 minutes

The maximum worker lock is bounded at one hour; the default is five minutes.

## Admin visibility

`get_automation_operations_360()` exposes job locks and recent run history to staff with `operations.select`. Raw execution tables remain inaccessible to browser clients.

## Safety / replay

A skipped run means another instance currently owns the job lock. A timed-out run is retained for audit. Failed runs retain an error message and do not silently report success. Business mutations remain behind existing canonical RPC boundaries.

## Rollback

Disable the scheduler trigger before reverting source. Existing tables and run history are retained. No production migration should be rolled back destructively; a forward migration is preferred if a control defect is discovered.

## Evidence boundary

Static verification certifies source contracts only. It does not claim that Edge Functions are deployed, schedules are active, provider credentials are valid, or production business UAT has passed.
