# Phase 10 — Background Workers and Scheduled Processes Report

**Date:** 2026-11-06  
**Foundation:** Validated Phase 9 source tree  
**Status:** Source repair complete; dependency, staging, scheduler and production gates remain outstanding.

## Audit scope

The review traced the Supabase operations scheduler, worker-secret authentication, pg_cron/pg_net/Vault dispatch, the five configured automation jobs, service-role RPC boundaries, durable run history, concurrency locks, stale-lock timeout handling, communication delivery/reconciliation, inventory reservation expiry, payment-provider reconciliation, invoice reminders, manual run/pause controls, diagnostics and operator visibility.

## Controls confirmed

- The scheduler accepts POST only and requires the constant-time worker secret through the dedicated header or bearer value.
- The operations scheduler runs only the allow-listed jobs: communications delivery, communications reconciliation, inventory reservation expiry, payment-provider reconciliation and invoice reminders.
- Worker RPCs use service-role-only grants; browser staff access is limited to permission-gated operational snapshots and control RPCs.
- `start_automation_job()` serializes each job with a row lock, creates an auditable run and marks expired locks timed out before a new acquisition.
- `finish_automation_job()` accepts only controlled terminal statuses, records bounded results/errors and releases only the matching job lock.
- Delivery workers retain provider-attempt history, stale-lock recovery, retry limits and uncertain-outcome protection.
- The admin automation page exposes schedule health, run history, manual execution, pause/resume and dispatch diagnostics.

## Finding and repair

### P10-01 — Schedule re-sync was not idempotent

The existing `private.ensure_automation_schedule()` called `cron.schedule()` for enabled jobs but did not first remove an existing named `topline-*` job. Re-syncing after a schedule edit could fail on duplicate job registration, leaving the active schedule and the operator’s settings out of alignment.

The Phase 10 migration now removes the exact named schedule before recreating it from the current `automation_job_settings` row. Disabled jobs are removed and not recreated. The reconciliation is deterministic by `job_key`, remains private, and does not alter the scheduler endpoint, job keys, worker secrets, or run-lock model.

## Validation results

- Phase 10 background-worker verifier: **PASS**
- Phase 9 admin permissions/operational actions verifier: **PASS**
- Admin authentication/authorization 360: **16/16 PASS**
- Admin control-plane privileged operations: **8/8 PASS**
- Automation/comms control verifier: **PASS**
- Operation 17 production automation structural verifier: **PASS**
- Migration integrity and SQL runtime safety: **PASS**
- Workflow register JSON parse: **PASS**

The source migration count is now **157**, with `20261106210000_audit10_background_workers_scheduled_processes.sql` as the latest migration. Dependency installation/build/typecheck and live scheduler execution were not treated as source evidence where the extracted tree lacks installed packages and external project access.

## Required staging / production gates

- Replay all 157 migrations on a disposable staging database with pg_cron, pg_net and Vault enabled; run schedule sync twice and confirm exactly one active named job per enabled setting.
- Run the scheduler with a real worker secret and verify each five-job path creates a run, acquires/releases its lock, records success/failure and remains replay-safe under concurrent triggers.
- Exercise stale-lock timeout and worker failure paths, including provider timeout, retry exhaustion, uncertain delivery, reservation expiry, payment reconciliation and invoice reminder failures.
- Verify pause/resume, manual run-now, dispatch diagnostics, scheduler health and role-constrained admin access on desktop and mobile browsers.
- Confirm real provider, email, payment, database backup/restore and production monitoring gates before release.

No commit, push, deployment, live provider call or production data change was performed.
