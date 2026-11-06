# Checkout test and payment error messages — 2026-10-12

Foundation: `TOPLINE-FLOORING-main-PRODUCTION-FIXED-2026-10-11.zip`. No new migrations (still 116). Tested with a stubbed Supabase client, not your live project.

## Fixed
1. **Customers saw a meaningless payment error.** When `payment-initiate` or `payment-status` answers with an error status (for example the new M-Pesa secret check, a missing provider setting, or a gateway refusal), supabase-js reports only "Edge Function returned a non-2xx status code" and the real reason in the response body was discarded. The checkout toast therefore said "Order Failed: Edge Function returned a non-2xx status code". `src/lib/customer-payments.ts` now reads the function's own JSON message (`{ success:false, error }`) and shows that. Reverting the fix makes the new test fail.
2. **Last US phone placeholders removed.** `+1 (555) 000-0000` was still the placeholder in the cart/checkout, contact form, lead form and site-settings fields; all now show `+254 7XX XXX XXX`.

## New interaction test (guest checkout, `tests/smoke/checkout.interaction.test.tsx`)
- Seeds a cart, fills the real checkout form and submits. Asserts the order request carries only product ids and quantities (no prices or totals, so the server prices the order), a non-empty idempotency key, then that `payment-initiate` is called with the new order id and chosen gateway, the cart is cleared and the customer lands on `/payment-return`.
- Payment refusal: shows the function's real reason, stays on the cart and keeps the items so the customer can retry (the idempotency key makes a retry reuse the same order).

Suite is now 189 tests across 6 files (about a minute).

## Observation (not changed)
Checkout creates the order first and then starts the payment. If payment cannot start, an unpaid order exists and the toast says "Order Failed". Stock held for it is released by the reservation expiry job, and a retry reuses the same order. Reasonable, but staff will see abandoned pending orders when a payment method is misconfigured, so test M-Pesa end to end after setting the secrets.

## Results (local only)
189 tests pass · `verify:all` 116/116 · typecheck 0 errors · lint clean · build passes.

## Still open
Provider overpayments roll back the event record; project budget JSON vs. cost ledger (your decisions); your environment steps (db push, function deploy and secrets, Vercel variables, DNS/HTTPS, real Brevo and payment tests).

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm ci
npm run verify:all
npm run test:smoke
git add -A
git commit -m "Show real payment function errors at checkout; add checkout interaction test; Kenyan phone placeholders"
git push origin main
```
