# Checkout delivery address validation

## Scope

The customer cart keeps delivery-area selection optional. When a customer selects an active delivery zone, checkout now requires a non-empty delivery address or nearby landmark before creating the order.

## Why

The fulfillment readiness contract requires a delivery address before dispatch. Previously, checkout could create and accept payment for an order with a delivery zone but no address, leaving operations unable to dispatch it without follow-up.

## Behaviour

- No delivery zone selected: address remains optional, preserving the existing checkout choice.
- Delivery zone selected: address/landmark is required.
- Validation is performed before the order RPC is called.
- The address input exposes required/invalid state and an inline error for assistive technology and keyboard users.
- The database remains authoritative for active-zone validation, delivery pricing, stock, coupons and final order totals.

## Verification

The commerce entry-point verifier includes source-contract checks for conditional address validation and accessible invalid-state messaging. Static checks do not replace browser checkout, local database replay or production UAT.
