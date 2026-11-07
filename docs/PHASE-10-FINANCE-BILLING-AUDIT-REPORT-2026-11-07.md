# Phase 10 — Finance & Billing Operations 360 Audit Report

**Date:** 2026-11-07  
**Authoritative foundation:** `TOPLINE-FLOORING-PHASE-09-COMPLETE-2026-11-07.zip`  
**Result:** Source-level hardening complete; staging and provider certification remain outstanding.

## Scope audited

- Canonical `invoices`, `invoice_items`, and `payments` tables.
- Invoice lifecycle transition and automatic refresh RPCs.
- Finance Operations 360 and Finance Control 360 reporting contracts.
- Invoice status UI and protected admin route permission.
- Existing payment recording, reconciliation and finance event-ledger behavior.
- Migration ordering, function execution grants, fixed search paths and regression continuity.

## Findings and repairs

### P10-01 — Partial status could be asserted without a partial collection

The original lifecycle RPC allowed a staff caller to move a sent or overdue invoice to `partial` without proving a positive payment existed. The replacement RPC derives the collected amount from `public.payments` while holding the invoice row lock. A partial status now requires `0 < paid < total` and a positive invoice total.

### P10-02 — Paid status accepted a zero-value invoice

The original check compared `amount_paid < total_amount`, which could allow a zero-total invoice to be marked paid. The replacement requires a positive invoice total and a canonical payment sum at least equal to that total.

### P10-03 — Fully collected invoices could be marked overdue

The original overdue check verified only that the due date had passed. The replacement also requires a positive outstanding balance derived from the canonical payment sum.

### P10-04 — Lifecycle status could be changed against a stale amount_paid projection

The transition RPC now compares the stored `invoices.amount_paid` projection to the sum of canonical payment rows and fails closed if they differ. The finance reconciliation path must correct the projection before a manual lifecycle change proceeds.

### P10-05 — Automatic lifecycle refresh did not repair stale payment totals

The replacement refresh RPC recalculates `amount_paid` from `payments`, then derives `paid`, `partial`, `overdue`, or `sent` for the eligible non-terminal invoice states. Changes are recorded in `invoice_events` with the reconciled amount and actor.

### P10-06 — Finance snapshot and route used inconsistent permission contracts

The legacy finance snapshot required `reports:read`, the newer Finance Control snapshot required `reports:select`, and the protected Finance Operations route was mapped to `payments:select`. The legacy snapshot and route now use `reports:select`, matching the current reporting contract. Mutating RPCs continue to enforce their own `invoices:update` or `finance:update` permission checks.

## Security and compatibility

- Existing canonical tables and payment ledgers remain the source of truth.
- Existing RPC names and parameter/return contracts are preserved.
- Invoice row locking remains ahead of payment-ledger reads; the canonical payment writer also locks the invoice row.
- Lifecycle and reporting functions use `SECURITY DEFINER` with `search_path = ''`.
- `PUBLIC` and `anon` execution are revoked; `authenticated` execution is explicitly granted. Staff permissions remain checked inside each RPC.
- Existing invoice event history, Finance Control event history, reconciliation, refunds, payment initiation and provider boundaries remain intact.
- No parallel invoice/payment tables or client-side financial authority were introduced.

## Changed paths

1. `supabase/migrations/20261107150000_finance_invoice_lifecycle_hardening.sql` — lifecycle, refresh and reporting RPC hardening.
2. `scripts/verify-phase-10-finance-billing-hardening.mjs` — 25 targeted assertions.
3. `package.json` — verifier command registration.
4. `.github/workflows/ci.yml` — Phase 10 hardening gate.
5. `src/lib/admin-permissions.ts` — Finance Operations route permission alignment.
6. `supabase/MIGRATION_MANIFEST.md` — migration record and active count.
7. `docs/MASTER-WORKFLOW-REGISTER.json` and `.csv` — Phase 10 status and authoritative foundation.
8. `scripts/verify-phase-7-customer-self-service-documents.mjs` and `scripts/verify-phase-8-communications-hardening.mjs` — refreshed cumulative foundation/count assertions.
9. `docs/PHASE_10_FINANCE_BILLING_360.md` — hardening addendum.

## Validation evidence

- `node scripts/verify-phase-10-finance-billing-360.mjs` — passed.
- `node scripts/verify-phase-10-finance-billing-hardening.mjs` — 25/25 passed.
- `node scripts/verify-phase-7-customer-self-service-documents.mjs` — 21/21 passed.
- `node scripts/verify-phase-8-communications-hardening.mjs` — 23/23 passed.
- `node scripts/verify-migration-integrity.mjs` — passed; 156 unique active migration timestamps.
- `node scripts/verify-sql-runtime-safety.mjs` — passed.
- `node scripts/verify-all.mjs` — 160/160 passed, 0 failed.
- `node --check scripts/verify-phase-10-finance-billing-hardening.mjs` — passed.
- Workflow JSON and package JSON parse successfully.

## Explicit limitations and release gates

- Root `node_modules` is absent. Vite build and lint were not run.
- A global TypeScript 5.8.3 check was attempted but cannot resolve project dependencies such as React and Wouter; its output is dependency-resolution noise and does not constitute a passing typecheck.
- PostgreSQL and Supabase CLI are unavailable in this execution environment. The new migration was not replayed against a disposable or staging database.
- Finance-role RLS matrix, simultaneous payment/lifecycle concurrency, browser invoice status UX, bank reconciliation UAT, and provider settlement UAT remain unverified.
- Do not deploy this migration until it has been replayed and validated in staging. No production database was modified.
- No provider payments/refunds were initiated. No Git commit, push or deployment was performed.

## Current foundation facts

- Active migrations: 156; latest: `20261107150000_finance_invoice_lifecycle_hardening.sql`.
- Root folder remains `TOPLINE-FLOORING-main/`.
- Phase 9 archive paths are retained; three new paths are added for this phase (migration, verifier, report).
- Phase 10 ZIP SHA-256 is recorded in the release handoff.
