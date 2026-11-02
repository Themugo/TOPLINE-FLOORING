# Cart Purchase Eligibility Audit

**Audit date:** 2026-11-02  
**Scope:** Product purchase eligibility, Add to Cart entry points, cart persistence, and the administrator product/inventory workflow.

## Finding

The shared cart implementation is present and the `/cart` route is registered. The shop, homepage, product detail page, and related-product actions use the shared `CartProvider` API. Cart state is hydrated from `localStorage` before the first interactive render and persisted after updates.

The most likely blocker is inventory eligibility, not a missing cart handler:

- `src/lib/product-commerce.ts` only permits a non-variant product when `is_active` is true, `in_stock` is true, and `stock_quantity > 0`.
- Variant products require an active selected variant with `stock_quantity > 0`.
- The existing `create_product_admin` database function explicitly creates products with `stock_quantity = 0`, even when its legacy `p_in_stock` flag is true.
- The product editor previously displayed the `in_stock` flag as the stock status and did not explain that the quantity must be recorded separately.
- The existing Admin > Inventory workflow uses the audited `adjust_product_stock` RPC to record stock movements and update the authoritative quantity.

Consequently, a product can appear flagged as “In Stock” in the admin product list while the storefront correctly refuses Add to Cart because its actual sellable quantity is zero.

## Corrections made

- Admin product list now displays the actual `stock_quantity`.
- Admin product status now requires both `in_stock` and a positive `stock_quantity` before showing “In Stock”.
- Product editor now explains that saving catalogue details does not create inventory and directs staff to Admin > Inventory to record received stock.
- Existing stock eligibility, checkout validation, inventory RPC, RLS, and order/payment rules were preserved. No inventory quantities were fabricated and no database migration was added.
- Added `scripts/verify-cart-stock-eligibility.mjs` and the `verify:cart-stock-eligibility` package script.

## Verification

- Cart stock eligibility regression checks: 6/6 passed.
- Shop/cart source contract checks: 16 assertions passed.
- Cart navigation and persistence source checks: 13 assertions passed.
- Public commerce UI contract: passed.
- Full `npm run verify:all`: 132/132 passed, 0 failed.

## Remaining live-data check

The code archive cannot establish whether each live product has stock recorded in the connected production database. An authorised staff member should open Admin > Inventory and confirm the relevant product has a positive quantity (or confirm the selected active variant has positive stock). Do not set stock quantities without a physical/verified inventory count. After a valid stock receipt or adjustment, reload the shop and test Add to Cart, cart badge, cart line, quantity update, removal, and checkout validation in an isolated or approved environment.

No production database was read or changed during this audit. No deployment, payment, customer communication, or Git push was performed. Browser-based live acceptance remains pending.
