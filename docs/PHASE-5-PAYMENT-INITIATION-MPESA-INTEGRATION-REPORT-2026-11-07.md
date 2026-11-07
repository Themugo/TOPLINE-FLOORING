# Phase 5 — Payment Initiation and M-Pesa Integration Audit

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-PHASE-04-COMPLETE-2026-11-07.zip`  
**Foundation SHA-256:** `c9b4d187655d29585f3da2d39b9eb93a056143d580a26a583391dd380cd58165`  
**Status:** Source-level payment initiation and callback hardening complete for the defects identified below; provider sandbox and production certification remain pending.

## 1. Preservation and scope

The Phase 4 project was extracted with its existing `TOPLINE-FLOORING-main/` root and directory hierarchy. All Phase 1–4 files and repairs were retained. No redesign, rebuild, duplicate feature, mock payment, mock inventory, production data change, deployment, Git commit or push was performed. The existing payment Edge Functions, provider adapters, payment tables, provider event ledger, customer payment recovery, reconciliation RPCs and release-certification controls remain the canonical implementation.

Phase 5 scope: payment initiation, STK Push configuration, customer phone validation, idempotency, payment attempt reservation, provider callback handling, replay controls, outstanding-balance checks, and failure/recovery behavior. Refund and general ledger work remains in the Phase 4/6 scope; this phase does not claim provider refund execution.

## 2. Defects identified and repairs

### P5-01 — Concurrent payment starts could race across different idempotency keys
**Severity: Critical — duplicate charge risk.**

`payment-initiate` previously queried for a pending transaction and then inserted a payment transaction and payment attempt in separate REST calls. Two browser sessions with different idempotency keys could both observe no pending transaction and both dispatch a provider charge. The per-key unique constraint does not serialize distinct keys.

**Repair:** Added `public.create_payment_attempt_atomic_360()` in the new ordered migration. It locks the target order or invoice row, rechecks that the target is payable and the requested amount does not exceed its current outstanding balance, checks the idempotency key, checks for another active online payment, and inserts the transaction and attempt in one database transaction. The Edge Function now calls this RPC instead of performing separate inserts. The function is service-role-only; public, anonymous and authenticated execution is revoked. Bank transfer is intentionally excluded from the immediate-charge lockout because it is not a provider-dispatched charge.

### P5-02 — A replay could expose an old provider request after the outstanding balance had fallen
**Severity: High — potential over-collection attempt.**

A retry of an existing attempt could return its previous provider checkout even if another payment had reduced the target balance since the original initiation.

**Repair:** Existing-attempt replay now compares the stored transaction amount with the freshly calculated outstanding balance and fails closed if the old attempt exceeds the current balance. It directs the customer to support for provider reconciliation/cancellation rather than presenting a stale checkout URL.

### P5-03 — Provider callback accepted GET requests and had no explicit payload-size ceiling
**Severity: Medium — webhook attack-surface and resource exhaustion.**

The shared callback endpoint accepted GET as well as POST, and parsed an unbounded request body before validation.

**Repair:** Callback now accepts POST only, reads the raw request bytes, rejects bodies larger than 64 KiB before JSON parsing, and verifies card-provider HMAC signatures against the exact raw request body. M-Pesa remains authenticated using the configured shared callback secret because Safaricom's STK callback does not provide a request signature; payment state is still changed only through the service-role reconciliation RPC and its event/amount/transaction checks.

## 3. Existing payment controls reviewed and retained

- Payment gateway must be enabled and customer-visible, and must support the target type.
- M-Pesa/card initiation is blocked unless the production provider release gate is certified and unexpired.
- Order/invoice email is checked against the supplied checkout email.
- Cancelled, paid and refunded orders cannot start a new charge.
- Order payment amount is derived from successful payment ledger rows; invoice amount uses its persisted amount-paid balance.
- Kenyan M-Pesa phone normalization accepts supported 07xx, 01xx and 254xx formats.
- M-Pesa STK amount is required to be a whole KES unit.
- M-Pesa callback secret is checked using constant-time comparison; merchant request and checkout request identities are matched.
- Card webhook uses HMAC-SHA256 over the raw body and a provider event ID.
- Customer payment-status access uses a one-time token whose SHA-256 hash is stored; no service credentials are exposed to the browser.
- Existing provider-event RPCs retain event replay/payload-hash checks, transaction matching, currency/amount checks and service-role-only grants.
- Existing customer payment-resume flow continues to use the persisted order and stable per-order/per-gateway idempotency key.

## 4. Files changed

- `supabase/migrations/20261107110000_payment_initiation_atomic_reservation.sql` — new atomic reservation RPC and least-privilege grants.
- `supabase/functions/payment-initiate/index.ts` — uses atomic reservation; rejects stale provider attempts exceeding the current balance.
- `supabase/functions/payment-callback/index.ts` — POST-only callback, 64 KiB body ceiling and raw-body HMAC verification.
- `scripts/verify-phase-5-payment-initiation-atomicity.mjs` — 18 targeted source-contract assertions.
- `scripts/verify-guest-payment-resume.mjs` — updates the in-flight payment assertion to verify the new atomic database boundary.
- `package.json` — registers `verify:phase-5-payment-initiation-atomicity`.
- `supabase/MIGRATION_MANIFEST.md` — registers migration 152 in timestamp order and updates the latest migration statement.
- `supabase/tests/browser_rpc_grants.sql` — regenerated for 161 RPCs.
- `docs/MASTER-WORKFLOW-REGISTER.json` and `.csv` — updates WF-05 and database migration count/status.
- `docs/PHASE-5-PAYMENT-INITIATION-MPESA-INTEGRATION-REPORT-2026-11-07.md` — this report.

No established files were renamed or moved. The project root remains `TOPLINE-FLOORING-main/`.

## 5. Verification executed

- `node scripts/verify-phase-5-payment-initiation-atomicity.mjs` — **18/18 passed**.
- `node scripts/verify-guest-payment-resume.mjs` — **19/19 passed**.
- `node scripts/verify-payment-webhook-reconciliation-360.mjs` — passed.
- `node scripts/verify-payment-initiation-reconciliation-360.mjs` — passed before the new migration; migration count is updated by the full suite.
- `node scripts/verify-payment-provider-boundary.mjs` — passed.
- `node scripts/verify-payment-refund-provider-trust-boundary-360.mjs` — passed before the new migration; Phase 4 regression is included in aggregate suite.
- `node scripts/verify-phase-4-order-fulfillment-finance.mjs` — **22/22 passed** before final aggregate rerun.
- `node scripts/verify-migration-integrity.mjs` — passed with **152 active migrations**.
- `node scripts/verify-sql-runtime-safety.mjs` — passed.
- `node scripts/generate-rpc-grant-test.mjs` — regenerated the browser RPC grant test for **161 RPCs**.
- `node scripts/verify-all.mjs` — **155/155 passed, 0 failed**.

Provider-specific UAT commands were also attempted and correctly blocked for missing environment inputs:
- `node scripts/verify-mpesa-provider-uat.mjs` — blocked because an isolated endpoint, test order, test customer email and test phone were not supplied.
- `node scripts/verify-payment-provider-uat.mjs` — blocked because `PAYMENT_WEBHOOK_URL` was not configured.

These blocked results are not counted as passing provider UAT.

## 6. Not run / not certified

- Dependency installation, TypeScript typecheck, lint and Vite production build. The extracted package has no `node_modules/` directory.
- PostgreSQL staging/disposable database replay and execution of `create_payment_attempt_atomic_360()` under concurrent sessions.
- M-Pesa Daraja sandbox STK Push, callback, timeout, duplicate/out-of-order callback and provider reconciliation UAT.
- Card provider sandbox charge and signed webhook UAT.
- Provider callback delivery retry from actual Safaricom/card provider systems.
- Real customer/admin RLS role matrix and service-role boundary execution against PostgreSQL.
- Customer payment resume and admin payment monitoring in browser/mobile devices.
- Production provider certification, deployment, production data changes, Git commit or push.

## 7. Acceptance decision

**Phase 5 source repairs are complete for the payment-initiation race, stale attempt replay and callback request-boundary defects identified in this audit. Phase 5 is not provider- or production-certified.** The new migration must be replayed on a disposable/staging database, and simultaneous payment initiation must be exercised using concurrent sessions before enabling production payment gateways. M-Pesa/card provider UAT must use an isolated test order and provider sandbox credentials. The Phase 5 package is the authoritative foundation for Phase 6.
