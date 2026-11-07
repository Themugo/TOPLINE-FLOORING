# G-07 — Background automation and communication worker UAT report

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-06-CUSTOMER-COMMUNICATIONS-2026-11-07.zip`  
**Project root:** `TOPLINE-FLOORING-main/`  
**Status:** **OPEN — live staging execution evidence required**

## Executive result

The repository already contains a Supabase-native background automation design using `pg_cron`, `pg_net`, Vault, the `operations-scheduler` Edge Function and the `deliver-communications` worker. This G-07 pass adds a dedicated CI-enforced structural verifier and a staging UAT runbook that specifies how to prove actual scheduled dispatch, worker execution, lock lifecycle, communication delivery and failure recovery.

No authenticated staging database or Edge Function deployment was available to this execution environment. No cron invocation or communication-worker execution is represented as live-tested. G-07 remains OPEN.

## Existing implementation confirmed

- Five configured jobs: `deliver_communications`, `reconcile_communications`, `expire_inventory_reservations`, `reconcile_payment_provider_events`, and `invoice_reminders`.
- `pg_cron` dispatches through `pg_net` to `operations-scheduler`.
- Vault supplies `topline_project_url` and `topline_worker_secret`; missing values are surfaced as failed dispatch runs without returning secret contents.
- The scheduler requires the dedicated worker secret using constant-time comparison and accepts only the five known job keys.
- Each job acquires a database run/lock record through `start_automation_job`, then records success/failure with `finish_automation_job`.
- The communications job invokes `deliver-communications` with the worker secret; the delivery worker has its own secret check, bounded processing and provider attempt handling.
- Staff controls for pause/resume, re-sync and run-now are permission gated.
- Scheduler health reports expected/registered schedules, Vault readiness and recent job runs. Dispatch diagnostics expose recent HTTP outcomes to authorized staff.

## Changes made

1. Added `scripts/verify-g07-background-automation.mjs` with 20 assertions covering the scheduler, worker, security boundary, job lifecycle, dispatch diagnostics, runbook and CI registration.
2. Registered `npm run verify:g07-background-automation` in `package.json`.
3. Added a dedicated G-07 source-contract step to `.github/workflows/ci.yml`.
4. Added `docs/G-07-BACKGROUND-AUTOMATION-UAT-RUNBOOK.md` with isolated staging setup, read-only SQL checks, cron/dispatch/run evidence, actual communication-worker test, failure/recovery checks and closure evidence.
5. Added `docs/audit-evidence/G-07-STATIC-VERIFICATION-2026-11-07.log`.

No database migration, production configuration, provider secret, or application runtime behavior was changed in this phase.

## Verification performed

| Check | Result |
|---|---:|
| G-07 dedicated source verifier | **20/20 passed** |
| Existing Pass 19 automation/communications verifier | Passed |
| Operation 17 production automation structural verifier | Passed — 163 migrations |
| G-06 customer communications source contract | **23/23 passed** |
| Migration integrity verifier | Passed |
| SQL runtime-safety static verifier | Passed |

## Not executed / remaining live gates

- No authenticated staging Supabase connection was available.
- No live `cron.job` schedule inventory was collected.
- No live Vault secret-name/readiness check was performed.
- No `pg_net` HTTP dispatch response was observed.
- No `operations-scheduler` Edge Function invocation was observed.
- No `automation_job_runs` or lock lifecycle was verified against a live database.
- No scheduled communication worker run, provider message ID, or controlled mailbox receipt was observed.

## G-07 closure criteria

G-07 closes only when the operator supplies sanitized staging evidence showing all five expected schedules active; required Vault secret names present (never values); scheduler dispatch HTTP 2xx; cron-triggered and manual automation run rows; successful run completion and lock release; overlap protection; one scheduled `deliver-communications` run tied to a specific outbox record and provider message ID; controlled mailbox receipt and genuine provider delivery callback (cross-reference G-06); and controlled failure/recovery results.

A passing static verifier or CI run is not evidence of hosted scheduler execution. Do not use production credentials, production recipients or production data for this UAT.
