# Commerce concurrent checkout, inventory and fulfilment testing

**Date:** 2026-11-07  
**Foundation:** G-13-based repaired source package  
**Scope:** Concurrent cart checkout, stock reservation, payment-attempt creation, stock consumption, order cancellation, delivery creation and fulfilment state transitions.  
**Disposition:** **SOURCE-CONTRACT TESTS PASS; REAL DATABASE CONCURRENCY AND STAGING UAT NOT RUN.**

## 1. Changes made

1. Added `scripts/verify-commerce-concurrency.mjs` with 23 source-contract assertions covering checkout serialization, duplicate-line aggregation, product/variant row locks, active reservation accounting, checkout idempotency, atomic payment-attempt creation, duplicate-charge prevention, stock-consumption traceability, delivery uniqueness, delivery-row locks, legal state transitions and cancellation reservation release.
2. Added `verify:commerce-concurrency` and `test:commerce-concurrency` npm commands.
3. Added the concurrency source-contract gate to `.github/workflows/ci.yml` after the existing G-14 commerce gate.
4. Added a staging-only concurrency UAT runbook at `docs/COMMERCE-CONCURRENCY-STAGING-UAT-RUNBOOK-2026-11-07.md`.

No existing commerce business RPC or migration was changed. No new database migration was introduced. No production configuration or data was changed.

## 2. Verification performed

- `node scripts/verify-commerce-concurrency.mjs` — **23/23 passed**.
- `node scripts/verify-commerce-concurrency.mjs --run-existing` — completed the new source-contract suite plus 11 existing targeted commerce/cart/inventory/payment/fulfilment regression scripts; all passed.
- `node scripts/verify-all.mjs` — **189/189 passed, 0 failed**.
- `node --check scripts/verify-commerce-concurrency.mjs` — passed.
- Package JSON parsed successfully and includes both new npm commands.
- CI workflow includes the new source-contract gate.

These are repository source-contract and regression checks. They do not simulate independent database sessions and must not be described as an actual race-condition test.

## 3. Code paths and controls reviewed

- Checkout aggregates duplicate cart rows by product and variant before stock checks.
- Checkout serializes competing reservations on the parent product row, locks a selected variant, and includes active unexpired reservations in availability.
- Checkout idempotency is backed by a unique database index and a unique-violation recovery path.
- Payment-attempt creation locks the order or invoice, validates the outstanding balance, handles matching idempotency replays and blocks another pending online charge during the provider uncertainty window.
- Inventory payment consumption records product/variant movement identity.
- Delivery creation locks the order and the database has a unique delivery-per-order index.
- Dispatch, transit and completion transitions lock the delivery row and validate allowed predecessor states; completion requires proof of delivery.
- Cancellation locks the order, blocks unsafe cancellation after dispatch and releases active reservations.

## 4. Finding requiring targeted runtime coverage

`check_order_fulfillment_readiness` calculates required order-item quantity and converted reservation quantity in one `order_items LEFT JOIN inventory_reservations` aggregate. The reservation table does not define a unique constraint for `(order_id, product_id, variant_id)`. If an order has multiple order-item rows and multiple reservation rows for the same product/variant, the join can multiply both sums and potentially mask a short reservation. Normal checkout aggregates cart lines, but legacy or manually created rows can still exercise this case.

This was not silently changed in this testing workstream because it requires a deliberate SQL migration and database replay. The staging UAT runbook includes a targeted duplicate-row/mismatched-quantity case. Until that case is addressed and replayed, treat readiness quantity reconciliation as an **OPEN correctness risk**, not certified.

## 5. Not run / not certified

- No independent concurrent PostgreSQL sessions were available in this workspace.
- No disposable/staging Supabase database or credentials were provided; no migration replay or RPC runtime execution was performed.
- No actual simultaneous checkout race, stock oversell, payment-provider retry, duplicate webhook, cancellation/payment race or dual delivery-transition race was executed against PostgreSQL.
- No M-Pesa/card sandbox charge or real fulfilment operation was performed.
- No browser checkout or staff fulfilment UAT was performed in this workstream.

Production certification remains **NO-GO / OPEN** until the staging runbook passes, including the open readiness aggregation case, and the results are retained as sanitized evidence.

## 6. Safety boundary

No production Supabase database, payment provider, customer data, DNS, hosting, Vercel configuration, Git remote, commit, push or deployment was accessed or changed. All changes are local source, CI and documentation updates only.
