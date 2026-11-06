# Phases 74–76 — Commerce Entry-Point Consistency 360

## Objective
Converge every customer-facing product entry point onto the same variant identity, price and availability contract established by the Commerce Fulfillment 360 initiative.

## Phase 74 — Product & Variant Commerce Contract
- Product listing queries now load product variants.
- Added canonical helpers for active variants, default variants, unit price, stock and purchasability.
- Base-product and variant pricing are resolved consistently.

## Phase 75 — Customer Cart & Checkout Integrity
- Shop, homepage featured products and related-product cards support variant selection.
- Cart identity remains product + variant.
- Checkout continues to send `variant_id` and relies on the database for authoritative price/stock validation.
- Checkout surfaces the authoritative rejection reason returned by the order RPC instead of masking it behind a generic message.

## Phase 76 — Regression & Release Gate
- Added `verify-commerce-entrypoints-360`.
- CI runs the new contract gate before release validation.
- No new database migration is required; the initiative consumes the existing variant-aware migration contract.

## Explicit boundary
The frontend never becomes authoritative for price or stock. The checkout RPC remains the source of truth.
