# Topline Flooring & Waterproofing — Remaining Real-World Gates

Date: 2026-09-14

## Status

### Completed in this sweep

- Payment provider webhook static boundary verification: PASS.
- Payment/refund/provider 360 verification: PASS (14/14).
- Production payments/reconciliation/provider webhook static verification: PASS.
- New provider UAT harness added.
- Invalid-signature, valid-signature and duplicate-event test procedure documented.
- Production secret/configuration runbook added.
- Public production site remains reachable.

### Cannot be honestly certified from this environment

1. Real provider sandbox transaction: requires the client's/provider's sandbox credentials and an isolated UAT order.
2. Real production webhook callback: requires provider-side production configuration and deployment access.
3. Actual payment/refund UAT: requires a real provider transaction and refund/reversal result.
4. Production Edge Function secret verification: secret values are intentionally not retrievable or exposed through source; verification must be performed in the Supabase deployment/secrets control plane.
5. Windows `npm ci && npm run lint && npm run typecheck && npm run build`: the container could not complete `npm ci`; offline retry failed because required npm tarballs were not cached. The repository itself is configured to run these checks in GitHub Actions on Node 22.

## Provider research

Safaricom's Daraja 3.0 portal provides sandbox application testing and production onboarding. The exact M-PESA product, shortcode/till/paybill, credentials and callback setup are account/provider-specific and therefore are not invented here.

## Operator commands

Install and quality gate on Windows:

```cmd
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING" && npm ci && npm run lint && npm run typecheck && npm run build
```

Provider UAT:

```cmd
set PAYMENT_WEBHOOK_URL=https://zmbsskvnzjdaxuxlauyx.supabase.co/functions/v1/payment-webhook
set PAYMENT_PROVIDER=mpesa
set PAYMENT_WEBHOOK_SECRET=<provider-webhook-secret>
set PAYMENT_UAT_ORDER_ID=<isolated-uat-order-uuid>
set PAYMENT_UAT_AMOUNT=1
set PAYMENT_UAT_CURRENCY=KES
set PAYMENT_UAT_ALLOW_MUTATION=true
node scripts\verify-payment-provider-uat.mjs
```

Do not place provider secrets in Git or any `VITE_*` variable.
