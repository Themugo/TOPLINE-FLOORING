# Topline Payment Provider UAT — Sandbox / Isolated Staging

**G-05 status:** source readiness only until a real provider-originated callback is received and reconciled.

## Scope and safety

This runbook certifies a provider transaction against an isolated sandbox or staging Supabase project. It is not permission to test against production. Never use a real customer, live till/paybill, production shortcode, production credentials, or production order for UAT. Do not paste secrets into chat, Git, tickets, command transcripts, or evidence artifacts.

The repository has a working Daraja STK Push adapter and callback path. It does **not** identify a card acquirer or provide a provider-specific card adapter contract. Card-provider UAT is blocked until the acquirer, sandbox API contract, credentials, callback signature specification, and sandbox merchant account are supplied.

## M-Pesa Daraja sandbox setup

### 1. Provision the isolated environment

- Create/use a dedicated Supabase sandbox or staging project that is not the canonical production project.
- Deploy `payment-initiate`, `payment-status`, and `payment-callback` Edge Functions to that project.
- Apply the required payment migrations to the isolated database only.
- In the Safaricom Daraja sandbox portal, create/use a sandbox app and the sandbox shortcode/passkey supplied for that app.
- Ensure the Edge Function callback URL is publicly reachable over HTTPS.

### 2. Configure Edge Function secrets

Set the sandbox API base URL explicitly. Do not rely on the function's production API default:

```cmd
supabase secrets set MPESA_BASE_URL=https://sandbox.safaricom.co.ke
supabase secrets set MPESA_CONSUMER_KEY=<sandbox-consumer-key>
supabase secrets set MPESA_CONSUMER_SECRET=<sandbox-consumer-secret>
supabase secrets set MPESA_SHORTCODE=<sandbox-shortcode>
supabase secrets set MPESA_PASSKEY=<sandbox-passkey>
supabase secrets set MPESA_CALLBACK_SECRET=<long-random-secret>
supabase secrets set MPESA_CALLBACK_URL=https://<sandbox-project-ref>.supabase.co/functions/v1/payment-callback?secret=<same-long-random-secret>
```

The `MPESA_CALLBACK_SECRET` value must exactly match the `secret` query parameter in `MPESA_CALLBACK_URL`. The callback handler rejects missing/mismatched secrets. Safaricom STK callbacks do not carry a provider HMAC signature, so this URL secret is a bearer credential: restrict access to deployment logs, redact query strings in observability tooling, and rotate it if exposed. Redeploy the payment functions after changing secrets.

Never place these values in `VITE_*`, source files, CI variables, or a client-visible configuration table.

### 3. Prepare one isolated test order

Create one disposable order in the sandbox database with:
- a known order UUID;
- a whole-number KES outstanding balance matching the sandbox STK amount;
- a test customer email and a phone number accepted by the Daraja sandbox;
- no real inventory fulfilment or production customer impact.

Confirm the selected `payment_gateway_methods` row is enabled/customer-visible in the sandbox and the sandbox provider certification gate permits the test. Do not weaken the production release gate to perform UAT.

### 4. Run the real STK + callback test (Windows CMD)

From the project root:

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

The script verifies the exact expected host and environment, refuses the canonical production hosts, creates one real STK attempt, and polls `payment-status` using the one-time attempt token. Complete the STK prompt on the designated test phone. A pass requires the provider callback to have updated the payment transaction to `successful` and populated a provider receipt/reference. The evidence file is written to `artifacts\payment-provider-uat\` and deliberately excludes access tokens, callback secrets, consumer credentials and the test phone/email.

The idempotency key is stable per isolated order. Do not rerun against the same order to force another charge. For another test, create a new isolated order and review the previous transaction first.

### 5. Required callback/reconciliation matrix

| Test | Execution | Expected evidence |
|---|---|---|
| Successful STK | Real sandbox prompt accepted | Actual callback received; transaction/order reconciled once; receipt saved |
| Failed/cancelled STK | Provider sandbox returns failure | Attempt marked failed; order remains unpaid |
| Duplicate callback | Replay the exact provider callback from an approved sandbox test harness or provider retry | Idempotent replay; no second payment/ledger posting |
| Invalid callback secret | Send a non-financial test request to the sandbox callback with wrong secret | HTTP 401; no payment mutation |
| Unknown checkout ID | Send a structurally valid test callback with unknown ID | HTTP 404; no payment mutation |
| Wrong amount / merchant identity | Use controlled test fixtures or provider sandbox support | Rejected; no paid state |
| Out-of-order failure after success | Replay failure event after verified success | Successful payment is not downgraded |
| Callback timeout | Suppress/delay callback in sandbox if supported | Remains pending; use Daraja Transaction Status reconciliation; never initiate another charge blindly |

Do not forge a successful callback and count it as a provider transaction. Any manually replayed callback is a security/idempotency test, not evidence that Safaricom delivered it.

## Generic signed webhook harness — not provider UAT

`scripts/verify-payment-provider-uat.mjs` currently creates a synthetic Topline HMAC event and posts it to `payment-webhook`. It verifies Topline's generic signature boundary, valid-event application and duplicate-event behavior. It does **not** call a payment acquirer, initiate a charge, or prove a real provider callback. Use it only with an isolated sandbox/staging order and endpoint; its generated event may mutate that test order's payment state.

Required environment:

```cmd
set PAYMENT_WEBHOOK_URL=https://<sandbox-project-ref>.supabase.co/functions/v1/payment-webhook
set PAYMENT_PROVIDER=<configured-provider-key>
set PAYMENT_WEBHOOK_SECRET=<sandbox-webhook-secret>
set PAYMENT_UAT_ORDER_ID=<isolated-order-uuid>
set PAYMENT_UAT_AMOUNT=1
set PAYMENT_UAT_CURRENCY=KES
set PAYMENT_UAT_ENV=sandbox
set PAYMENT_UAT_EXPECTED_HOST=<sandbox-project-ref>.supabase.co
set PAYMENT_UAT_ALLOW_MUTATION=true
node scripts\verify-payment-provider-uat.mjs
```

This generic path is separate from Safaricom's native STK callback, which uses `payment-callback` and the `MPESA_CALLBACK_SECRET` URL check.

## Card provider status

Card UAT cannot be executed yet: no named acquirer or provider-specific signature/payload contract is defined in this project baseline. Do not point a real acquirer at the generic webhook and assume compatibility. Supply the provider name, sandbox documentation, sandbox merchant account, signing method, event examples, test card details and callback registration details before implementing its adapter.

## Production boundary

No UAT step above deploys to production, changes production secrets, records production certification, enables a production gateway, or sends a live charge. Production activation requires separate explicit approval after sandbox evidence review and the production release-control workflow. G-05 remains OPEN until provider portal records and Topline database reconciliation evidence agree.
