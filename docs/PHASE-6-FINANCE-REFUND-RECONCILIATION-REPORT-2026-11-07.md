# TOPLINE FLOORING — Phase 6 Finance, Refunds and Reconciliation Audit

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-PHASE-05-COMPLETE-2026-11-07.zip`  
**Foundation SHA-256:** `0d72ba26168003cd174bcc3f346372b445fb153b9aa76766ff4402467cd62971`  
**Status:** Source-level fixes complete for the defects described below. Provider refund execution, PostgreSQL runtime and production certification remain pending.

## 1. Preservation and scope

The Phase 5 package was extracted with its existing `TOPLINE-FLOORING-main/` root. Existing Phase 1–5 code, migrations, scripts, UI, providers and workflows were retained. No redesign, rebuild, duplicate financial subsystem, mock transaction, production data change, deployment, Git commit or push was performed.

Phase 6 covers refund concurrency and replay, payment/refund ledger consistency, reconciliation-derived payment state and financial audit events. Existing payment provider adapters and the existing financial tables/RPCs remain canonical.

## 2. Findings and repairs

### P6-01 — Refund completion and refund creation acquired row locks in opposite order
**Severity: High — deadlock risk under concurrent finance operations.**

The Phase 4 `create_order_refund_request` path locks the parent order before payment/refund rows. The previous `complete_order_refund` path locked the refund row first and then its parent order. A concurrent create/complete operation on the same order could therefore form an order↔refund lock cycle.

**Repair:** The replacement completion RPC first reads the refund's parent key without locking, locks the order, then locks and revalidates the refund row. This uses the same parent-before-child order as refund creation. The RPC remains finance-permission protected, SECURITY DEFINER with an empty search path, and unavailable to PUBLIC/anon.

### P6-02 — Reconciliation could misclassify a fully refunded partial payment
**Severity: High — inaccurate customer/admin financial status.**

The previous reconciliation compared successful refunds against the full order total to derive `refunded`. If an order had a partial successful payment and that entire payment was refunded, the order could be incorrectly left as `partial` even though all funds actually collected had been returned.

**Repair:** Reconciliation now derives `paid` and `refunded` from successful payment transaction and successful refund ledger totals. It marks the payment status `refunded` when the successful refund total equals the successful amount collected (and collection is greater than zero), while retaining `paid` only when successful collections cover the full order total. It fails closed if refunds exceed successful payments.

### P6-03 — Refund completion outcomes were not written to the finance control event ledger
**Severity: Medium — incomplete operational audit trail.**

Refund rows retained provider state, but the finance control event stream did not receive a corresponding event from the Phase 4 completion RPC.

**Repair:** Successful and failed refund completion now writes a `refund_succeeded` or `refund_failed` event with amount, prior/new status, note and actor. Terminal replays return idempotently and do not create duplicate events.

### P6-04 — Refund completion accepted unexpected intermediate states
**Severity: Medium — state-transition ambiguity.**

**Repair:** Only `pending` and `processing` refunds can be completed. Terminal states remain replay-safe; successful replay must retain the same provider and provider refund identity. Existing unique provider/refund identity index remains the duplicate-provider guard.

## 3. Files changed

- `supabase/migrations/20261107120000_finance_refund_reconciliation_hardening.sql` — order-first refund locking, explicit refund transition validation, finance event audit, and corrected reconciliation status derivation.
- `scripts/verify-phase-6-finance-refund-reconciliation.mjs` — 20 targeted source-contract assertions.
- `package.json` — registers `verify:phase-6-finance-refund-reconciliation`.
- `supabase/MIGRATION_MANIFEST.md` — registers migration 153 in timestamp order.
- `docs/MASTER-WORKFLOW-REGISTER.json` and `.csv` — updates WF-06 and migration/verification status.
- This report.

No existing project file or directory was renamed or moved. The root remains `TOPLINE-FLOORING-main/`.

## 4. Verification executed

- `node scripts/verify-phase-6-finance-refund-reconciliation.mjs` — **20/20 passed**.
- `node scripts/verify-migration-integrity.mjs` — passed; **153 active migrations**, unique timestamps.
- `node scripts/verify-sql-runtime-safety.mjs` — passed.
- `node scripts/verify-phase-4-order-fulfillment-finance.mjs` — **22/22 passed**.
- `node scripts/verify-phase-5-payment-initiation-atomicity.mjs` — **18/18 passed**.
- `node scripts/verify-all.mjs` — **156/156 passed, 0 failed**.

The aggregate suite also retained the existing authentication, inventory, cart/quotation, order, admin authorization, payment provider boundary, communications, document vault, database dependency, RPC authorization, and release-candidate static checks.

## 5. Not run / not certified

- PostgreSQL disposable/staging migration replay and actual execution of the replacement RPCs.
- Concurrent refund-create/refund-complete sessions to demonstrate deadlock absence at runtime.
- Provider sandbox refund initiation, callback, duplicate response and timeout/retry UAT.
- Reconciliation against real provider settlement statements and unmatched/duplicate provider transactions.
- Customer/admin RLS role matrix against a running database.
- Dependency installation, TypeScript typecheck, lint and Vite production build.
- Browser/mobile finance and refund journeys.
- Production provider certification, deployment, production data changes, Git commit or push.

## 6. Acceptance decision

**Phase 6 source hardening is complete for the defects identified. It is not staging-, provider- or production-certified.** Replay the new migration on a disposable/staging PostgreSQL database and exercise concurrent refund creation/completion before production use. Validate all provider refund identities against provider-side settlement records; this source change does not execute refunds with a payment provider.

The Phase 6 package is the authoritative foundation for Phase 7.
