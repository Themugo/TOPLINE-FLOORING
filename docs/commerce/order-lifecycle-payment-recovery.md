# Order lifecycle and payment recovery hardening

## Findings addressed

- Provider callbacks can arrive after an initiation request times out. The initiation Edge Function now distinguishes a request that may have reached the provider from a failure before dispatch. A post-dispatch uncertain outcome remains `pending`, is explicitly marked `initiation_outcome=unknown`, and returns the attempt ID plus the one-time status token so the customer can continue to the payment-return page.
- The customer payment event RPC can match an existing failed attempt for a verified late success and reconcile that same ledger row rather than requiring a still-pending row.
- A stale provider failure/cancel event no longer downgrades a transaction already marked successful, reversed, refunded or partially refunded.
- Callback target identity is checked against the payment transaction's order/invoice relationship.
- The customer payment callback now consumes reserved product/variant stock exactly once when an order first becomes fully paid. If a verified late payment arrives after the reservation expired or stock is no longer available, the payment is still recorded and a `fulfillment_events` not-ready exception is created for staff review; the system does not pretend the order is dispatch-ready.
- M-Pesa callback correlation now uses Safaricom `CheckoutRequestID` as the stable provider transaction ID. The receipt is retained as the provider reference. A failed database reconciliation now returns HTTP 500 to the provider instead of acknowledging the callback or mutating payment rows through a non-atomic fallback.

## Browser-close recovery

Orders are created before payment initiation and remain persisted server-side. The checkout idempotency key is retained locally until a recoverable payment attempt is returned, so a reload before that point can replay the same order creation. Replaying the same payment key reissues a fresh one-time status token for the existing attempt without sending a second provider charge. Authenticated customers can revisit their account and inspect the order/payment status through the existing customer portal and payment-status RPC. The browser return token is deliberately a one-time bearer credential stored as a hash in the database; this change does not persist that credential in localStorage. A guest who closes the browser before saving the payment-return link still needs a supported guest order-recovery channel. That remains a release gap and is not claimed as solved by this change.

## Important boundaries

- Additive migration only; not applied to any database by this work.
- No production payment, provider call, deployment, Git push or customer communication performed.
- A callback is trusted only after the existing provider authentication/signature/secret checks.
- Provider callbacks, provider dashboard evidence and staging payment tests are still required to certify real-world late-event behavior.

## Verification

Run `node scripts/verify-order-payment-recovery.mjs` and the full `npm run verify:all`. This static verifier checks source contracts; it does not replace SQL execution against a disposable Supabase database or provider sandbox UAT.
