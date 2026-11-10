# Commerce concurrency staging UAT runbook

**Purpose:** Exercise actual database serialization using separate PostgreSQL sessions against a disposable/staging Supabase project.  
**Prerequisite:** Apply the complete ordered migration set to an isolated database and use synthetic products, variants, customers, orders and staff identities. Never run race tests against production or real customer stock.

## Evidence rules

For every test retain: test ID, UTC start/end, migration head, synthetic fixture IDs, session labels, SQL/RPC invocation, returned status/error, before/after stock, reservation rows, payment rows and delivery/event rows. Redact tokens, phone numbers, provider secrets and customer data. A test passes only when the final database invariants below hold.

## Test matrix

| ID | Concurrent actions | Required invariant |
|---|---|---|
| CC-01 | Two sessions checkout the same product with stock 1, each requesting quantity 1, using different idempotency keys | Exactly one checkout succeeds; the other reports insufficient stock; total active reservations never exceed 1. |
| CC-02 | Two sessions submit the same checkout payload and same idempotency key | Exactly one order and one set of order lines/reservations exist; both callers resolve to the same order identity. |
| CC-03 | Same cart contains repeated lines for the same product/variant | Quantity is aggregated before stock validation; only one reservation group is created for that product/variant. |
| CC-04 | Two sessions checkout the same variant with stock 1 | Exactly one succeeds; parent product stock does not substitute for variant stock. |
| CC-05 | Two payment starts for one order use different idempotency keys while the first is pending | Only one live online provider charge attempt is created; the other returns the in-progress conflict. |
| CC-06 | Two identical payment-start requests use the same idempotency key | One payment transaction and one payment-attempt identity exist; replay returns the existing attempt. |
| CC-07 | Two success callbacks/replays target the same payment transaction | Stock is consumed once; one successful ledger outcome is retained; variant/product movement identity is correct. |
| CC-08 | Payment success races with order cancellation | Order/payment locks serialize the outcome; no paid order is silently cancelled and no reservation is both released and consumed. |
| CC-09 | Two staff sessions create a delivery for the same order | At most one delivery row exists for the order; the losing request receives a controlled conflict. |
| CC-10 | Two staff sessions dispatch the same delivery | One transition/event is recorded; the second cannot create a duplicate dispatch transition. |
| CC-11 | Dispatch races with cancellation | A dispatched delivery cannot be cancelled by the order-only cancellation path. |
| CC-12 | Two staff sessions complete the same delivery | One completion transition and one delivered event are recorded; proof-of-delivery requirements remain enforced. |
| CC-13 | Failed delivery recovery races with a new exception or dispatch | Only a legal state transition wins; terminal/invalid transitions are rejected and event history matches final state. |
| CC-14 | Construct an order with duplicate order-item rows and duplicate reservation rows for one product/variant, including a short converted total | Readiness must compare quantities per product/variant without join multiplication; a short reservation must never be marked ready. This is an OPEN risk identified by source review. |
| CC-15 | Expiry worker races with payment success near reservation expiry | No stock is double-released or double-consumed; late-success reconciliation follows the documented exception path. |

## Execution approach

1. Provision a disposable Supabase/PostgreSQL environment with the exact staging migration head and isolated synthetic fixtures.
2. Open two independent SQL sessions or two independent authenticated RPC clients. Do not run both calls sequentially in one transaction and call that a concurrency test.
3. Coordinate simultaneous starts with a barrier in the test driver. Record each session's invocation and response.
4. Query final rows directly using a privileged staging-only role. Validate all required invariants in the matrix.
5. Repeat stock and payment race cases at least 25 times with fresh fixture IDs to expose scheduling-dependent defects.
6. Run the ordinary commerce regression suite after the race tests and verify no residual fixtures or active reservations remain.
7. Attach sanitized evidence and obtain reviewer sign-off before changing any production release gate.

## Pass/fail and stop conditions

- Any oversell, duplicate order for one idempotency key, duplicate online charge attempt, duplicate stock consumption, negative stock, double release, duplicate delivery, illegal state transition or incorrect readiness result is a **FAIL**.
- Any SQL error caused by missing migration, role, permission or fixture setup is **BLOCKED**, not a pass.
- Stop immediately if a test points to production, a real provider account, a live customer/order, or a non-synthetic inventory record.
- Do not enable provider dispatch or production migration deployment as part of this runbook.
