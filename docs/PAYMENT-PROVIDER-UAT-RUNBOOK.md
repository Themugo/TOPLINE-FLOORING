# Topline Payment Provider Sandbox / Live UAT Runbook

## Purpose

Certify the real provider -> Topline payment webhook path without allowing browser-supplied payment success to mutate payment state.

## Preconditions

- Provider account is owned/configured by Topline/client.
- Provider sandbox or production webhook secret is available through the provider's secure dashboard.
- An isolated UAT order exists with a known order UUID and a safe test amount.
- `payment-webhook` Edge Function is deployed at the project's Supabase Functions endpoint.
- `SUPABASE_SERVICE_ROLE_KEY` is configured only as an Edge Function secret; never in `VITE_*` variables.
- Provider callback URL points to `/functions/v1/payment-webhook`.

## Environment variables on the operator machine

```cmd
set PAYMENT_WEBHOOK_URL=https://zmbsskvnzjdaxuxlauyx.supabase.co/functions/v1/payment-webhook
set PAYMENT_PROVIDER=mpesa
set PAYMENT_WEBHOOK_SECRET=<provider-webhook-secret>
set PAYMENT_UAT_ORDER_ID=<isolated-uat-order-uuid>
set PAYMENT_UAT_AMOUNT=1
set PAYMENT_UAT_CURRENCY=KES
```

Then run:

```cmd
set PAYMENT_UAT_ALLOW_MUTATION=true && node scripts\verify-payment-provider-uat.mjs
```

The harness checks:

1. Invalid signature -> HTTP 401.
2. Valid signed payment -> successful application.
3. Duplicate identical event -> idempotent replay.

## Manual provider UAT matrix

| Test | Expected result |
|---|---|
| Valid sandbox payment | One successful payment transaction |
| Duplicate callback | No second transaction |
| Invalid signature | 401; no payment mutation |
| Expired timestamp | 401; no payment mutation |
| Wrong amount | Provider event rejected by financial invariant |
| Wrong order | Provider event rejected / failed |
| Wrong currency | Rejected; Topline remains KES-only |
| Failed provider payment | Recorded as processed failure; order remains unpaid |
| Reversal/refund | Provider-specific refund/reversal reconciles without duplicate refund |
| Partial refund | Order becomes `partial` where applicable |
| Full refund | Order becomes `refunded` when successful refunds reach order total |

## Production secret verification

Verify in the Supabase Edge Function secrets/configuration UI or deployment tooling that:

- `SUPABASE_URL` exists.
- `SUPABASE_SERVICE_ROLE_KEY` exists and is not exposed to frontend code.
- `PAYMENT_<PROVIDER>_WEBHOOK_SECRET` exists, or `PAYMENT_WEBHOOK_SECRET` is configured.
- No payment secret appears in `VITE_*` variables, repository files, CI logs, or client bundles.

Do not paste secrets into Git, chat, issue trackers, or test reports.

## Important boundary

This project intentionally does not claim live payment certification until a real provider account, real callback, real UAT order and provider-side transaction result have been exercised. Safaricom's Daraja platform supports sandbox app testing and production onboarding; exact credentials, shortcode/till/paybill and callback configuration remain provider/account-specific.
