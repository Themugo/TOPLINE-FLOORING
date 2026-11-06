# TOPLINE Payment Provider Certification + Production Activation 360

## Implemented
- Production certification ledger for each gateway and environment.
- Staff-only certification evidence recording.
- Release gate requiring an unexpired production certification before M-Pesa/card gateways can be enabled and customer-visible.
- Gateway configuration writes routed through a SECURITY DEFINER control function; direct authenticated UPDATE on the gateway catalogue is revoked.
- M-Pesa transaction-status fallback Edge Function for callback recovery/reconciliation.
- Existing idempotent callback and payment ledger remain canonical.

## M-Pesa certification
Safaricom Daraja supports sandbox testing, production onboarding, asynchronous STK callbacks and a Transaction Status API for secondary reconciliation. See official Daraja documentation.

Required UAT evidence:
- successful sandbox payment;
- failed payment;
- duplicate callback;
- invalid callback/signature boundary where applicable;
- wrong amount/reference rejection;
- timeout/no-callback recovery using Transaction Status API;
- customer return + status polling;
- production callback reachability;
- production test transaction before customer enablement.

## Card certification
The repository still has no named card provider. The adapter remains provider-neutral. Production certification must not be recorded until the actual provider, API contract, webhook signature scheme, sandbox credentials and UAT callback have been supplied.

## Production activation rule
M-Pesa/card customer enablement requires an unexpired `production/certified` record. Bank transfer is not provider-certification gated because it is manually reconciled.

## Secrets
Provider credentials remain Edge Function/deployment secrets. Never store provider secrets, private keys, webhook secrets, or access tokens in `payment_provider_certifications`, `public_config`, frontend code, Git, or reports.

## M-Pesa sandbox UAT command

Set only non-secret UAT identifiers locally. Provider secrets stay in Supabase Edge Function secrets:

```cmd
set PAYMENT_INITIATE_URL=https://<project>.supabase.co/functions/v1/payment-initiate
set PAYMENT_UAT_ORDER_ID=<isolated-order-uuid>
set PAYMENT_UAT_EMAIL=<isolated-customer-email>
set PAYMENT_UAT_PHONE=2547XXXXXXXX
set PAYMENT_UAT_GATEWAY_KEY=mpesa
set PAYMENT_UAT_EXPECTED_AMOUNT=1
set MPESA_UAT_ENV=sandbox
npm run verify:mpesa-provider-uat
```

The script starts a real sandbox STK attempt when the Edge Function is configured. Complete the test on the test phone, then verify callback, return, duplicate callback and failure/retry behavior. Do not use a production customer or real production payment for sandbox certification.

## Production activation

1. Complete provider UAT.
2. Record production certification evidence in Admin → Site Control Center → Payments & Messaging.
3. The database control boundary rejects M-Pesa/card customer enablement without an unexpired production certification.
4. Add production secrets only to Supabase Edge Function secrets.
5. Change `MPESA_BASE_URL` to the approved production endpoint and verify the live callback URL.
6. Perform a controlled production test transaction.
7. Re-check payment ledger, customer return state, duplicate callback behavior and order/invoice reconciliation.
8. Only then leave the gateway customer-visible and enabled.
