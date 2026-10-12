# Payment callback hardening — 2026-10-09

No new migrations (still 116). Edge functions were run under Node with a stubbed database, not on Supabase.

## Fixed
**M-Pesa callbacks were accepted without any authentication when `MPESA_CALLBACK_SECRET` was not set.** Safaricom does not sign callbacks, so the only protection is a secret in the callback URL, and `payment-callback` checked it only "when set". Anyone who learned a `CheckoutRequestID` could then post a forged success. Measured by calling the handler with and without the fix:

| Case | Before | After |
|---|---|---|
| No secret configured | proceeds to the database | 501 "M-Pesa callback secret is not configured" |
| Secret set, none/wrong in URL | 401 | 401 |
| Secret correct | proceeds | proceeds |

`payment-initiate` now also refuses to send an STK prompt unless `MPESA_CALLBACK_URL` carries `?secret=` equal to `MPESA_CALLBACK_SECRET`; otherwise a customer could be asked to pay and the callback would then be rejected, leaving the payment unrecorded. Setup steps are in `docs/PAYMENT-PROVIDER-UAT-RUNBOOK.md`, and `verify-edge-function-deploy-config` fails if either function drops this behaviour.

**Action needed before deploying these two functions:** set `MPESA_CALLBACK_SECRET` and put the same value in `MPESA_CALLBACK_URL` (`...payment-callback?secret=<value>`), or M-Pesa checkout will refuse to start. Card payments are unaffected.

## Reviewed, no change needed
`payment-webhook` (card): HMAC over the raw body, optional timestamp with 5-minute skew limit, constant-time comparison, 512 KB body cap, per-provider secret, idempotent by event id. A shared `PAYMENT_WEBHOOK_SECRET` fallback applies to every provider that has no specific secret.

## Please check before committing
Several edge function files in my working copy (`payment-initiate`, `payment-status`, `payment-callback` typing, `_shared/cors.ts`) and one migration (`20261003090000_customer_portal_order_payment_fields.sql`) differ from the zip you uploaded and were not written by me. They pass every check here (116/116, typecheck, lint, build, 116 migrations replayed), but run `git diff` and confirm they match what you intend to ship.

## Results (local only)
`verify:all` 116/116 · typecheck 0 errors · lint clean · build passes · edge functions parse.

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm run verify:all
git diff --stat
git add -A
git commit -m "Fail closed on M-Pesa callbacks without a secret; refuse prompts whose callback would be rejected"
git push origin main
supabase secrets set MPESA_CALLBACK_SECRET=<random-value>
supabase secrets set MPESA_CALLBACK_URL=https://zmbsskvnzjdaxuxlauyx.supabase.co/functions/v1/payment-callback?secret=<random-value>
supabase functions deploy payment-initiate payment-callback
```
