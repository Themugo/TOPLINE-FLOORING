# TOPLINE Public Commerce Feature Audit — 2026-10-02

## Scope
Audited the public shopping and customer-commerce flows in the current hardened source package, with particular attention to the inactive **Add to Cart** control.

## Root cause fixed
The shared `useProducts()` public catalogue query loaded products, categories and brands but did not load `product_variants`.

Variant-aware products therefore reached Shop/Home without their variant stock records. The shared `isProductPurchasable()` rule correctly treated such products as non-purchasable when their base product stock was zero, leaving **Add to Cart** visible but disabled.

### Fix
`src/hooks/use-data.ts`
- Public product listing query now includes `variants:product_variants(*)`.
- This fixes variant data consistently for Home, Shop and related-product entry points.

## Additional commerce fix
`src/lib/product-commerce.ts`
- Default variant selection now prefers an in-stock active default.
- If the configured default is out of stock, the first in-stock active variant is selected automatically.
- This prevents a purchasable product from appearing blocked simply because its preferred variant is temporarily unavailable.

`src/pages/shop-detail.tsx`
- Product-detail Add to Cart now applies the same shared purchasability guard as Shop/Home before mutating cart state.

## Existing features audited
- Product catalogue loading
- Category filtering
- Search
- Stock filtering
- Sorting
- Product variants and option selection
- Add to Cart from homepage
- Add to Cart from Shop
- Add to Cart from Product Detail
- Related-product Add action
- Cart quantity changes
- Cart removal and clearing
- Coupon validation
- Delivery-zone selection and charge calculation
- Customer checkout validation
- Secure server-side order creation
- Checkout idempotency key
- Variant identity preserved into checkout
- Server-authoritative pricing/stock validation
- Order confirmation and tracking handoff
- Customer quotation request
- Customer contact submission
- Customer portal service requests/feedback

## Verification completed
### PASS
- Ecommerce stability verification
- Commerce Fulfillment 360 verification
- Payment/inventory lifecycle verification
- Payment/refund/expiry verification
- Catalog/Product/Service/Upload integrity verification
- Customer Portal 360 verification
- Commerce Entry-Point Consistency 360 verification
- Customer Self-Service 360 verification
- Public tracking contract verification
- Public order-tracking privacy verification
- Launch gap verification
- Invoice hook contract verification
- Admin feedback contract verification
- Database read boundary verification
- Release candidate gate
- New Public Commerce UI Contract verification

## Build limitation
`npm ci --ignore-scripts --no-audit --no-fund` timed out twice in the execution environment. Therefore this package does **not** claim a dependency-backed TypeScript check, lint, production build, or browser E2E pass.

Those remain required in the real project environment:

```cmd
npm ci
npm run db:types
npm run typecheck
npm run lint
npm run build:all
```

Then perform browser UAT against the linked Supabase environment, especially:
1. Open a product with variants.
2. Confirm an in-stock variant is selected automatically.
3. Confirm Add to Cart is active.
4. Add one and multiple quantities.
5. Open Cart and change quantity/remove/clear.
6. Apply/remove a valid coupon.
7. Select delivery area.
8. Place a real test order.
9. Confirm order number and tracking handoff.
10. Repeat from Home and Shop to confirm all entry points behave consistently.

## No feature drift
No new business capability was introduced. The changes only restore the intended existing commerce behavior and align all public purchase entry points with the existing variant-aware backend contract.
