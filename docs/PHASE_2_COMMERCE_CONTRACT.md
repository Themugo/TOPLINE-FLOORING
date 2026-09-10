# Phase 2 — Commerce Contract Hardening

## Objective

Make public quotation, contact, coupon and checkout flows consume one explicit client-side commerce boundary and one authoritative server transaction contract.

## Canonical client boundary

`src/lib/commerce.ts` is the only client module for the public commerce RPCs:

- `submitQuotationRequest()` → `submit_quotation_request`
- `validateCoupon()` → `validate_coupon`
- `createCustomerOrder()` → `create_customer_order`

Pages should not call these RPCs directly.

## Transaction rules

The database is authoritative for checkout values. The browser does not establish the final order subtotal, delivery charge, discount, or total.

`032_commerce_contract_hardening.sql`:

1. Replaces the incompatible checkout RPC signature with the canonical 11-argument contract already expected by the application domain.
2. Recalculates product prices from active products.
3. Recalculates delivery from the selected active delivery zone.
4. Revalidates and row-locks coupons inside the order transaction.
5. Increments coupon usage only after successful validation inside checkout.
6. Calculates and stores the authoritative order total.
7. Returns a structured JSON result containing the order reference and authoritative financial values.
8. Makes coupon validation read-only; applying a coupon in the UI does not consume it.

## Quotation/contact rules

Both flows now use the same quotation RPC contract. Contact messages are represented as general quotation/lead enquiries rather than calling a non-existent or incomplete RPC signature.

The quotation page maps its company, area, substrate and timeline information into the canonical request fields without inventing database parameters.

## Database deployment

This phase does not require a Supabase project to exist yet. The migration is the deployment artifact to apply when the dedicated Topline Supabase project is provisioned.
