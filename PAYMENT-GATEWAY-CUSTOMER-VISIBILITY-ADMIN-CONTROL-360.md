# TOPLINE — Payment Gateway Customer Visibility + Admin Control 360
Date: 2026-10-02

## Objective
Make payment methods visible wherever a customer needs to pay while keeping gateway configuration, activation, health and secrets under Admin Control.

## Canonical database contract
Migration:
`20261002190000_payment_gateway_customer_visibility_admin_control_360.sql`

Active migration count after this change: **108**.

### Canonical table
`public.payment_gateway_methods`

It stores:
- gateway key/provider
- customer display name/description
- payment method
- customer visibility
- enabled state
- checkout/order/invoice availability
- phone requirement
- display order
- safe public configuration
- private admin configuration
- required server secret names
- provider health/test state

### Customer boundary
Customers do not receive direct table access.

`get_customer_payment_methods(context)` is the only customer-facing discovery boundary and returns only:
- enabled gateways
- customer-visible gateways
- gateways enabled for the requested context
- safe public fields

Secret-like JSON keys are filtered server-side from public configuration.

### Admin boundary
Gateway rows are protected by the existing `settings` permissions.
Secrets remain deployment/Edge runtime configuration and are never editable or exposed in browser code.

## Customer surfaces enhanced
### Checkout
Payment methods are now loaded from the canonical database catalogue instead of hard-coded options.

### Customer order details
Outstanding orders expose the currently enabled payment methods.

### Customer invoice details
Outstanding invoice balances expose the currently enabled payment methods.

Disabled/unconfigured gateways are not presented as available customer options.

## Admin Control
Site Control Center → Payments & Messaging now includes **Customer Payment Gateways** where authorized administrators can control:
- enabled/disabled
- customer-visible/hidden
- customer display name
- customer description
- display order
- checkout availability
- order-payment availability
- invoice-payment availability
- phone requirement
- provider metadata/health visibility

The UI explicitly does not expose gateway credentials.

## Initial catalogue
The database seeds:
- M-Pesa
- Card
- Bank Transfer

All start disabled until the corresponding provider is actually configured and activated.

This prevents the customer UI from falsely advertising a gateway that cannot process a real payment.

## Verification
`verify-payment-gateway-customer-visibility-360.mjs`

PASS:
- canonical gateway table
- RLS
- admin settings boundary
- public RPC
- disabled/hidden filtering
- secret-like public-config filtering
- checkout integration
- order integration
- invoice integration
- admin control integration
- 108 migration count
- unique migration timestamps

## Build/UAT boundary
A fresh TypeScript/Vite build was not claimed because the package does not contain the complete installed dependency tree (`node_modules`).

Real provider initiation and webhook UAT remain separate gates. This change deliberately does not fabricate a successful payment-provider transaction.
