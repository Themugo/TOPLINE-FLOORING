# G-05 — Payment provider UAT execution report

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-04-FRONTEND-BUILD-CERTIFICATION-2026-11-07.zip`  
**Project root:** `TOPLINE-FLOORING-main/`  
**Scope:** M-Pesa Daraja sandbox STK initiation, actual callback reconciliation, provider event idempotency, callback identity checks, UAT evidence capture, and provider-specific readiness.

## Executive result

**G-05 status: OPEN — provider sandbox credentials, isolated Supabase target, test order and test phone were not supplied.** No STK push was initiated, no provider callback was received, no payment or refund was created, and no production system was contacted or changed.

The source-side UAT workflow is now prepared to perform a real M-Pesa sandbox transaction and wait for the provider-originated callback. The source/static contract passed. This is not provider certification.

## Source corrections

1. Reworked `scripts/verify-mpesa-provider-uat.mjs` from an initiation-only check into a guarded STK + callback reconciliation runner:
   - requires an isolated sandbox/staging/local environment and exact expected host;
   - rejects the canonical Topline production website and Supabase project;
   - requires explicit `MPESA_UAT_ALLOW_MUTATION=true`;
   - validates whole-KES expected amount and callback wait bounds;
   - requires the exact `payment-initiate` function endpoint;
   - initiates one STK request with a stable per-order idempotency key;
   - polls `payment-status` using the returned one-time access token;
   - passes only when the persisted transaction reaches `successful` and a provider receipt/reference exists;
   - records a sanitized JSON evidence summary without secrets, access token, phone or email.
2. Hardened the M-Pesa callback parser to reject missing/non-integer/negative `ResultCode` values rather than silently treating malformed values as a payment failure.
3. Hardened merchant identity validation: the callback must contain `MerchantRequestID`, the stored transaction must contain the expected merchant request ID, and they must match exactly.
4. Rewrote `docs/PAYMENT-PROVIDER-UAT-RUNBOOK.md` to separate real Daraja callback UAT from the synthetic generic HMAC webhook harness, explicitly configure the sandbox API base URL, document callback secret handling, and define the provider test matrix.
5. Updated the activation guide and acceptance checklist to include the required host and mutation guards and the actual callback polling behavior.
6. Replaced the legacy hard-coded `RUN-PAYMENT-PROVIDER-UAT.cmd` behavior with a Windows CMD launcher for the real M-Pesa sandbox runner.
7. Added `scripts/verify-g05-payment-provider-uat.mjs`, registered `verify:g05-payment-provider-uat`, and added the static payment boundary/reconciliation checks to CI. CI does not run live provider UAT or send a charge.
8. Corrected a stale release-safety test assertion to check the local database reset guard's current stdout message.

## Verification performed

| Check | Result |
|---|---|
| G-05 source/UAT contract | PASS (15/15) |
| Release safety guard suite | PASS (4/4) |
| Payment initiation atomicity | PASS (18/18) |
| Guest payment resume | PASS (19/19) |
| Payment initiation/reconciliation 360 | PASS (163 migrations) |
| Payment provider boundary | PASS |
| Payment webhook reconciliation 360 | PASS |
| Provider certification/activation structural verifier | PASS (163 migrations) |
| Phase 6 finance/refund reconciliation | PASS (20 assertions) |
| Edge Function deployment configuration | PASS (15 functions) |
| Migration integrity | PASS |
| SQL runtime-safety static verifier | PASS |
| G-03 linked Supabase safety contract | PASS (static only) |
| G-04 frontend build safety contract | PASS (static only) |
| CI YAML and package JSON parsing | PASS |
| M-Pesa UAT with missing endpoint/order/contact | BLOCKED as intended (exit 2) |
| Generic webhook UAT with missing endpoint | BLOCKED as intended (exit 2) |
| Actual Daraja STK + provider callback | NOT RUN — credentials/test order/test phone unavailable |

The focused verification transcript is `docs/audit-evidence/G-05-STATIC-VERIFICATION-2026-11-07.log`.

## Provider configuration requirements

For M-Pesa sandbox, the operator must provide and configure in the isolated Supabase project's Edge Function secrets:

- `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_SECRET`
- `MPESA_CALLBACK_URL=https://<sandbox-project-ref>.supabase.co/functions/v1/payment-callback?secret=<same-secret>`

Deploy `payment-initiate`, `payment-status`, and `payment-callback` to that isolated project and ensure the callback URL is reachable over HTTPS. The sandbox database must contain the required payment schema and a disposable order whose outstanding balance equals the sandbox test amount.

The callback secret is a bearer credential in the URL because the Daraja STK callback does not provide a provider HMAC signature. Restrict callback URL query-string logging and rotate the secret if exposed.

## Card-provider limitation

No named card acquirer or provider-specific API/signature contract is present in this foundation. The generic card callback handler is not evidence of compatibility with any specific acquirer. Card UAT remains blocked until the provider, sandbox docs, merchant account, credentials, signature rules, payload samples and callback registration details are supplied.

## Exact operator execution — Windows CMD

After confirming the isolated sandbox project and creating a disposable test order:

```cmd
set PAYMENT_INITIATE_URL=https://<sandbox-project-ref>.supabase.co/functions/v1/payment-initiate
set PAYMENT_UAT_ORDER_ID=<isolated-order-uuid>
set PAYMENT_UAT_EMAIL=<sandbox-test-email>
set PAYMENT_UAT_PHONE=2547XXXXXXXX
set PAYMENT_UAT_GATEWAY_KEY=mpesa
set PAYMENT_UAT_EXPECTED_AMOUNT=1
set MPESA_UAT_ENV=sandbox
set MPESA_UAT_EXPECTED_HOST=<sandbox-project-ref>.supabase.co
set MPESA_UAT_ALLOW_MUTATION=true
set MPESA_UAT_CALLBACK_TIMEOUT_SECONDS=300
npm run verify:mpesa-provider-uat
```

Complete the STK prompt on the designated test phone. Review `artifacts\payment-provider-uat\mpesa-uat-*.json`. A timeout means callback not proven; do not initiate another payment blindly. Reconcile with Daraja's transaction-status facility and inspect provider callback delivery logs.

## Closure criteria

G-05 cannot close until all of the following are evidenced:

1. Real sandbox STK initiation accepted by Daraja.
2. Actual provider callback reaches the deployed sandbox `payment-callback` endpoint.
3. Callback identity, amount, currency and checkout request match the reserved payment attempt.
4. Database transaction and order/invoice payment state reconcile exactly once, with provider receipt/reference.
5. Failed/cancelled callback leaves the order unpaid.
6. Duplicate/replayed callback does not create another payment or ledger posting.
7. Wrong callback secret, unknown checkout, wrong amount and mismatched merchant request are rejected without payment mutation.
8. Timeout/recovery is demonstrated without blindly creating a second charge.
9. Provider portal transaction and Topline payment ledger reconcile.
10. Card provider UAT is either completed against a named acquirer or explicitly removed from the enabled payment methods.

No `supabase db push`, production secret update, production function deploy, production charge/refund, gateway activation, Git commit or push was performed in this phase.
