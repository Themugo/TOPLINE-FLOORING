# TOPLINE Payment Initiation + Pay Now + Reconciliation 360

## Scope
This phase extends the existing DB-driven payment gateway catalogue into real server-side payment initiation and reconciliation.

### Implemented
- M-Pesa STK Push initiation using Safaricom Daraja from Supabase Edge Functions.
- M-Pesa callback handling with transaction identity and amount checks.
- Card hosted-checkout initiation through a provider-neutral server contract.
- Signed card callback handling.
- Bank-transfer payment attempt creation and customer-safe instructions.
- Customer Pay Now for orders and invoices.
- Opaque payment-return token so guests can safely poll their own payment attempt.
- Customer payment status endpoint.
- Unified `payment_transactions` + `payment_attempts` ledger.
- Invoice and order provider-event reconciliation.
- Finance-only bank-transfer reconciliation controls.
- Idempotency and provider-event replay protection.
- Provider credentials remain Edge Function/deployment secrets; never React/browser code.

## New database migration
`supabase/migrations/20261002200000_payment_initiation_reconciliation_360.sql`

Adds:
- `payment_attempts`
- payment transaction initiation/return fields
- `payment_provider_events.invoice_id`
- `get_customer_payment_status(...)`
- `reconcile_payment_attempt_360(...)`
- `apply_customer_payment_provider_event(...)`
- hardened customer payment-method projection that excludes initiation/webhook URLs and secret-like keys

## Edge Functions
- `payment-initiate`
- `payment-callback`
- `payment-status`

Existing `payment-webhook` remains intact for the older generic signed-provider boundary.

## Provider secrets / deployment configuration
### M-Pesa
Server-only:
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL`
- optional `MPESA_BASE_URL` (defaults to `https://api.safaricom.co.ke`)

### Card
Server-only:
- `CARD_GATEWAY_SECRET`
- optional `CARD_GATEWAY_INITIATE_URL`
- `PAYMENT_CARD_WEBHOOK_SECRET` (or `PAYMENT_WEBHOOK_SECRET`)
- optional `PAYMENT_CARD_CALLBACK_URL` / `PAYMENT_CALLBACK_URL`

The card gateway request/response contract is intentionally provider-neutral because the project has not yet selected a named card provider. The admin-controlled `public_config.initiation_url` is non-secret and is filtered out of the customer payment-method RPC.

### Supabase
The Edge Functions require the normal server-side:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These never enter frontend bundles.

## Customer flow
1. Customer selects an admin-enabled payment method.
2. Checkout/order/invoice creates a pending payment transaction + attempt.
3. Server validates target ownership/email, outstanding amount, gateway state and idempotency.
4. M-Pesa sends STK; card returns hosted checkout URL; bank transfer returns instructions.
5. Customer is returned to `/payment-return` with an opaque attempt token.
6. Status polling reads only that attempt.
7. Provider callback marks the same ledger transaction successful/failed.
8. Successful order payments update order payment state and existing inventory lifecycle.
9. Successful invoice payments update invoice amount paid/status and the invoice payment ledger.
10. Bank transfers remain pending until finance verifies them in Admin → Finance Operations.

## Important production boundary
This phase is code-complete for the provider-neutral payment initiation architecture, but live provider certification is still required before enabling a gateway in production.

Do not enable a gateway merely because the UI switch exists. Confirm credentials, callback URLs, provider test environment, webhook delivery, amount/reference reconciliation, failure handling and return flow in provider UAT first.

## Validation status
- Migration inventory: 109 unique migrations.
- Static structural checks: PASS.
- Browser build/typecheck: NOT CLAIMED in this phase because the supplied workspace has no installed `node_modules` (`tsc`/`vite` unavailable locally). Previous npm dependency installation attempts timed out due transport conditions.
- Live Supabase deployment: NOT CLAIMED. The known Supabase transport timeout remains an external deployment blocker.
- Live M-Pesa/card provider UAT: NOT CLAIMED.
