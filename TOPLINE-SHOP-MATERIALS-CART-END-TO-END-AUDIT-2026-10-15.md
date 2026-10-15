# TOPLINE Shop & Materials Cart — End-to-End Audit

Date: 2026-10-15
Foundation: `TOPLINE-CART-NAVIGATION-AND-LOGO-UNIFORMITY-FIX-2026-10-15.zip`

## Findings

1. **Shop card button could appear dead because purchase eligibility was silently blocking it.** The handler returned without feedback when `isProductPurchasable` rejected the product, and the card's stock badge previously relied only on `product.in_stock`. That could show “In Stock” while the CTA was disabled because the authoritative quantity/variant stock was zero. The card now derives the badge from the same purchase-eligibility rule. The CTA adds to the cart when purchasable; when inventory is unavailable or inconsistent, the CTA remains actionable and routes to the existing quotation workflow instead of silently doing nothing. It does not fabricate stock or bypass inventory checks.
2. **Cart hydration/persistence had a timing hazard.** The provider loaded `localStorage` in an effect while another effect persisted the initial empty state. Cart hydration is now synchronous in the reducer initializer and persisted entries are shape-checked before they are used.
3. **Shop listing and product-detail cart actions used inconsistent paths.** Both now use the shared `addToCart` API. The shop listing adds the chosen product/variant and navigates to `/cart`; product detail adds the selected quantity in one dispatch.
4. **Product detail quantity could exceed available stock.** Quantity increase is now capped at the selected variant/product stock, and switching variants clamps the current quantity.
5. **Unavailable product detail had no clear next step.** It now communicates that the material cannot currently be added to cart and offers a quotation request link.
6. **Related-product actions were not aligned with the shared cart API.** They now use the same quantity-aware action and stock-aware label.

## Preserved safeguards

- Products are not made purchasable by overriding `stock_quantity` or `in_stock`.
- Variant-level stock checks remain in force.
- The server-side checkout/order process remains the authority for final stock and price validation.
- Existing cart route, product routes, quote flow, navbar/footer logo asset, and project architecture are retained.
- No database migrations or production data changes were made.

## Verification

- `node scripts/verify-cart-navigation-and-brand-uniformity.mjs` — PASS, 13 source-contract assertions.
- `node scripts/verify-shop-cart-end-to-end.mjs` — PASS, 15 source-contract assertions.
- The prior Windows baseline reported 194/194 smoke tests, TypeScript typecheck, and production build passing before this sweep. The full Windows smoke suite, typecheck, lint, and production build must be rerun after applying this ZIP because this environment does not contain the project's installed `node_modules`.

## Important data check

If a product still cannot be added, inspect that product's `stock_quantity`, `in_stock`, and active variant `stock_quantity` values in the real catalogue. A product with zero available quantity must not be silently sold; this sweep makes that state visible rather than inventing inventory. The local build previously generated a static sitemap with zero products because Supabase was not configured in that local build; that does not prove production inventory is empty.
