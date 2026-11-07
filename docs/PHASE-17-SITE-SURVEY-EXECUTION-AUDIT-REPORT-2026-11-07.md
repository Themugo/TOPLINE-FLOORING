# TOPLINE Phase 17 — Site Survey & Visit Execution 360

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-PHASE-16-COMPLETE-2026-11-07.zip`  
**Scope:** Harden the existing canonical `site_visits` workflow; no parallel visit model, redesign, production data change, deployment, commit or push.

## Executive result

Phase 17 hardening is complete at source/static-verification level. The existing Phase 15 CRM and Phase 16 quotation-to-order-to-project paths were retained. The existing `site_visits` table and transactional lifecycle RPCs remain the source of truth.

## Evidence-backed findings and repairs

1. **Scheduling authorization was too permissive.** The prior RPC accepted either `projects:insert` OR `quotations:update`. Scheduling now requires `projects:insert`; status changes continue to require `projects:update`.
2. **Quotation/customer/project links were not fully constrained.** Scheduling now locks and verifies the quotation, derives its linked project from the canonical relationship, derives the customer from quotation/project where possible, and rejects mismatches against either linked record.
3. **Appointment dates could be stale.** Scheduling rejects past dates and same-day times earlier than the database local time.
4. **Assignment integrity needed to be enforced at the transaction boundary.** Assigned staff must have an active `staff_profiles` row. The admin screen now offers active staff from the existing table.
5. **A status-only transition could claim a visit was rescheduled without changing its appointment.** The status RPC no longer accepts `rescheduled` as a new status; completed and cancelled visits remain non-reopenable. A dedicated date-changing reschedule workflow is not claimed as implemented.
6. **The admin list hid read failures and over-fetched data.** The page now selects explicit columns, shows read errors with a retry action, and displays assignment and linked project/quotation context.
7. **Input bounds and audit consistency.** Visit type and notes have server-side length bounds. Scheduling and status changes continue to record lifecycle events transactionally.

## Files changed

- `supabase/migrations/20261107190000_phase_17_site_visit_execution_integrity.sql` — canonical RPC hardening.
- `src/pages/admin/site-visits.tsx` — active staff assignment, explicit data selection, load-error/retry state and accurate status actions.
- `scripts/verify-phase-17-site-visit-execution.mjs` — 19 focused assertions.
- `scripts/verify-phases-15-17.mjs` — combined lifecycle regression now includes Phase 17 controls.
- `package.json` — registers `verify:phase-17-site-visit-execution`.
- `.github/workflows/ci.yml` — runs the dedicated Phase 17 gate before the combined lifecycle gate.
- `supabase/MIGRATION_MANIFEST.md` — registers the migration and updates active migration count.
- `docs/PHASES_15_17_SALES_PROJECT_LIFECYCLE.md` — records Phase 17 integrity contract and external gates.

## Validation

| Check | Result |
|---|---:|
| Phase 17 focused verifier | 19/19 passed |
| Phase 16 quotation/order/project verifier | 16/16 passed |
| Phase 15 CRM verifier | 13/13 passed |
| Combined Phase 15–17 lifecycle verifier | Passed |
| Migration integrity | Passed; 161 active unique timestamps |
| SQL runtime safety static verifier | Passed |
| Repository-wide `scripts/verify-all.mjs` | 164/164 passed |
| Toolchain verifier | Passed; Node 22.16.0, npm 10.9.2 |
| ZIP archive integrity | Passed after packaging |

The full repository suite does not subsume the new dedicated Phase 17 check; that check was run separately and passed 19/19.

## Not run / external gates

- Root `node_modules` is absent. ESLint, TypeScript typecheck, Vite production build and browser tests were not run locally.
- Local Supabase/PostgreSQL is not provisioned here; migration replay, live function compilation, RLS/permission matrix and concurrent scheduling tests remain staging gates.
- Browser/device UAT for scheduling, assignment, load failure/retry and completion/cancellation remains outstanding.
- No live customer/staff notifications or provider delivery tests were initiated.

## Safety and continuity

The Phase 16 project root and existing files were preserved. No secrets or `.env` file were added. No production database was changed, no deployment was run, and no Git commit or push was made. The resulting Phase 17 ZIP is the authoritative foundation for the next phase.
