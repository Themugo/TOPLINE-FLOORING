# Phase 4 — Order Creation, Cancellation & Fulfilment Audit

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-PHASE-3-CART-QUOTATIONS-CHECKOUT-2026-11-06 (1).zip`  
**Foundation SHA-256:** `393d49b28b2dffda2da08843e057af2a956928eae29438a6cc56203c6a0ed6bc`  
**Status:** Source-level repairs complete for the defects identified below; not production-certified.

## 1. Preservation and scope

The archive was extracted with its existing `TOPLINE-FLOORING-main/` root and directory hierarchy intact. Phase 3 source, tests, migrations and reports were retained. No redesign, rebuild, feature duplication, mock inventory, production data change, deployment, Git commit or push was performed. The only new source files are the Phase 4 migration and its targeted verification script; the Phase 4 report is added under the existing `docs/` convention. Existing package scripts, migration manifest and master workflow registers were updated in place.

Reviewed the existing order status RPC, payment and refund RPCs, payment initiation and callback Edge Functions, payment reconciliation, delivery lifecycle RPCs, customer self-service and document trust-boundary checks, communications outbox and worker, scheduler, admin order operations, migration manifest and existing regression verifiers.

## 2. Defects and repairs

### P4-01 — Repeated cancellation could decrement coupon usage repeatedly
**Severity: High — financial/promotion integrity.**

The previous `update_order_status_transaction()` allowed a same-state `cancelled` update to run through the cancellation side effects again. Reservation release was effectively idempotent, but the coupon `current_uses` decrement was not. Repeated admin submissions or a retried request could therefore release more than one coupon use for one order.

**Repair:** Same-state order transitions now return an explicit idempotent replay before executing side effects. Coupon usage and reservation release happen only on the first transition into `cancelled`.

### P4-02 — Order status transitions were not constrained to a lifecycle graph
**Severity: High — order integrity.**

The previous RPC validated status values and terminal states, but allowed arbitrary jumps between non-terminal states, such as `pending` directly to `completed`.

**Repair:** The RPC now permits only `pending → confirmed|processing|cancelled`, `confirmed → processing|completed|cancelled`, and `processing → completed|cancelled`. Same-state requests are idempotent. Completed and cancelled orders cannot be reopened.

### P4-03 — Cancellation did not reconcile an existing pre-dispatch delivery
**Severity: High — operational consistency.**

The old cancellation path released stock/coupon state but left a pending or processing delivery record active. That could leave dispatch staff with a live delivery against a cancelled order.

**Repair:** On first cancellation, pre-dispatch deliveries are moved to `cancelled` and a delivery event is recorded. Cancellation is blocked if a delivery is already `dispatched`, `in_transit` or `delivered`; those cases require operational resolution rather than an order-only state change.

### P4-04 — Refund request could be attached to the wrong payment transaction
**Severity: High — financial audit integrity.**

The prior refund request RPC summed all successful payments and outstanding refunds at order level, but attached the new refund to the latest successful payment transaction regardless of whether that single transaction covered the requested amount. For orders funded by multiple payments, this could make the `payment_transaction_id` attribution misleading.

**Repair:** The existing schema is preserved. Refund creation now locks the order and successful payment rows, calculates remaining refundable balance per payment transaction, and attaches the refund only to a transaction with sufficient remaining capacity. If a requested amount spans multiple transactions, the RPC requires the operator to split it into separately attributable refund requests rather than recording a false relationship.

### P4-05 — Refund idempotency key was not bound to the original request parameters
**Severity: Medium — retry correctness.**

A previously used refund idempotency key returned the existing refund even if the retry supplied a different order or amount.

**Repair:** Replays now succeed only when both order ID and amount match. A mismatched reuse is rejected. Amount precision, key length and reason length are validated.

### P4-06 — Fully refunding a partially paid order could leave payment status as partial
**Severity: High — finance/customer status correctness.**

The previous refund completion logic compared refunded amount against the full order total. If the order had only been partially paid and all received funds were refunded, its payment status remained `partial` even though no paid balance remained.

**Repair:** Payment status is now derived from the successful payment ledger and successful refund ledger. If refunded total is positive and greater than or equal to the paid total, status becomes `refunded`; partial refunds remain `partial`; otherwise the state is derived from paid total versus order total. Refunds exceeding successful payments are rejected.

### P4-07 — Completed refund replay could silently accept a different provider identity
**Severity: Medium — audit integrity.**

The old terminal-state replay returned success for a completed refund without comparing the provider and provider refund ID supplied by the retry.

**Repair:** A successful refund replay must retain the same provider and provider refund ID. A different identity is rejected.

## 3. Existing systems reviewed and retained

- **Payment initiation/callbacks:** Existing server-side initiation, customer identity checks, amount/balance checks, provider credentials and signed webhook boundary retained. M-Pesa callback path uses the configured callback secret; provider callback result is applied through the service-role payment event RPC.
- **Payment reconciliation:** Existing event persistence, replay payload hash checks, provider transaction matching, payment attempt state and order total guards retained.
- **Refunds/finance:** Existing payment/refund tables, uniqueness indexes, finance permission checks and order-level finance snapshot retained; this phase hardens the refund request/completion boundaries without changing table shape.
- **Customer documents/self-service:** Existing private document storage and customer self-service RPC boundaries retained; the existing static trust-boundary verifier passed.
- **Email/SMS/WhatsApp:** Existing outbox, channel gating, provider webhook and delivery worker retained; static delivery-worker checks passed. Actual provider delivery is not claimed.
- **Admin actions/RBAC:** Existing order operation snapshot and permission-checked mutation RPC retained and hardened; authorization certification static checks passed.
- **Background workers:** Existing `pg_cron`/`pg_net`/Vault scheduler, run locks and run records retained. Runtime schedule execution was not available for verification.
- **Database/RLS:** Existing migration chain, RPC grants, policies and trust boundaries retained; one ordered migration added. Static migration integrity and SQL safety checks passed.
- **Responsive journeys:** Existing customer/admin interfaces and responsive contracts retained. No live browser/device testing was available, so no visual or journey certification is claimed.

## 4. Files changed

- `supabase/migrations/20261107100000_order_fulfillment_finance_integrity.sql` — new migration with cancellation lifecycle, delivery consistency and refund ledger hardening.
- `scripts/verify-phase-4-order-fulfillment-finance.mjs` — new targeted source regression verifier (22 assertions).
- `package.json` — adds `verify:phase-4-order-fulfillment-finance`.
- `supabase/MIGRATION_MANIFEST.md` — registers the new migration in timestamp order.
- `docs/MASTER-WORKFLOW-REGISTER.json` — updates Phase 4 scope and certification statuses.
- `docs/MASTER-WORKFLOW-REGISTER.csv` — same status updates, preserving existing columns and order.
- `docs/PHASE-4-ORDER-CREATION-CANCELLATION-FULFILMENT-REPORT-2026-11-07.md` — this report.

No existing files were renamed or moved. No existing root directory or route was renamed.

## 5. Verification executed

- `node scripts/verify-phase-4-order-fulfillment-finance.mjs` — **22/22 assertions passed**.
- `node scripts/verify-commerce-fulfillment-360.mjs` — passed.
- `node scripts/verify-fulfillment-operations-360.mjs` — passed.
- `node scripts/verify-order-operations-360.mjs` — passed.
- `node scripts/verify-payment-webhook-reconciliation-360.mjs` — passed.
- `node scripts/verify-payment-refund-provider-trust-boundary-360.mjs` — **14/14 passed** (prior to adding the Phase 4 migration).
- `node scripts/verify-delivery-worker-hardening.mjs` — passed.
- `node scripts/verify-customer-self-service-360.mjs` — passed.
- `node scripts/verify-customer-self-service-rpc-trust-boundary-360.mjs` — **14/14 passed**.
- `node scripts/verify-admin-control-plane-privileged-operations-360.mjs` — **8/8 passed**.
- `node scripts/verify-sql-runtime-safety.mjs` — passed.
- `node scripts/verify-migration-integrity.mjs` — passed with **151 active migrations**.
- `node scripts/verify-db-9-11.mjs` — passed with **151 active migrations**.
- `node scripts/verify-payment-refund-provider-trust-boundary-360.mjs` — **14/14 passed** with Phase 4 as the latest migration.
- `node scripts/verify-all.mjs` — **154/154 passed, 0 failed**.
- `node scripts/verify-rpc-authorization-certification.mjs` — passed.
- `node scripts/verify-phase-3-cart-quotations-checkout.mjs` — **16/16 passed**.

The full `node scripts/verify-all.mjs` suite was rerun after registering the new migration and **passed 154/154 verifiers, 0 failed**. Build, typecheck and runtime gates below remain open.

## 6. Not run / not certified

- Dependency installation, TypeScript typecheck, lint, Vite production build and Vitest suite.
- Disposable/staging PostgreSQL migration replay and actual execution of the new SQL functions.
- RLS tests using real anonymous, customer, staff and service-role database sessions.
- M-Pesa/card provider sandbox transactions, signed callback replay/out-of-order tests, provider reconciliation and refund provider execution.
- Refund concurrency tests with multiple simultaneous finance operators.
- Worker scheduling/execution against configured `pg_cron`, `pg_net`, Vault and deployed Edge Functions.
- Brevo, Africa's Talking and WhatsApp live delivery and delivery-report UAT.
- Customer/admin Playwright journeys, mobile/tablet device testing and real responsive screenshots.
- Production deployment, production data changes, Git commit or push.

## 7. Acceptance decision

**Phase 4 source repairs are complete for the identified order cancellation, delivery consistency and refund ledger defects. Phase 4 is not production-certified.** The migration must be replayed on a disposable/staging database and the order, payment, refund, worker, communication and customer/admin browser journeys must pass before production use. Phase 4 package is the authoritative source foundation for the next phase, subject to those gates.
