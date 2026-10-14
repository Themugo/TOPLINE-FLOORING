# TOPLINE Shop Page — Deep Audit and Rebuild

Date: 2026-10-14
Foundation: `TOPLINE-FULL-PROJECT-PORTFOLIO-DEEP-REBUILD-2026-10-14.zip`

## Scope

Reviewed the public shop page, product-detail page, cart state, cart/checkout entry points, product-variant helpers, product admin entry points, and existing smoke-test references. This update is intentionally scoped to the public shop page and a static verification script; it does not change schema, payment logic, stock reservation, admin product CRUD, or order persistence.

## Findings and changes

1. **Category counts could be misleading.** The shop passed the selected category into `useProducts`, so the displayed count for other categories was calculated from a subset. The shop now loads the active catalogue once and combines category/search/stock filters locally.
2. **Search coverage was too narrow.** Search now checks the product name, slug, descriptions, SKU, material, collection, unit, category, brand, and variant text/SKUs.
3. **Marketing claims were not guaranteed by product records.** The hero no longer asserts certification or guaranteed delivery/rates. It explains available product details, checkout delivery options, and enquiry support without inventing guarantees.
4. **Cart continuation was not prominent after items were added.** When cart items exist, a visible View Cart link and count are displayed above the catalogue.
5. **Search/sort controls need accessible labels.** Explicit accessible names were added.
6. Existing retry, loading skeletons, empty-filter state, variant selection, purchasability guard, image fallback, featured/price/name sorting, and cart integration are retained.

## Workflow inventory

- Catalogue loading, active products, retry and load-error display
- Category filtering and per-category counts
- Search across product and variant metadata
- In-stock filter
- Featured, ascending price, descending price and name sorting
- Product image fallback and product-detail navigation
- Active variant selection and displayed variant-aware unit price
- Purchasability check before add-to-cart
- Add confirmation and cart navigation/count
- Empty search/filter state and filter reset
- Responsive sidebar/grid and semantic search/sort labels
- Product detail, cart, checkout, coupon, delivery, payment and order workflows reviewed as connected downstream paths but not certified live by this source-only update

## Validation boundary

The included verifier checks source contracts only. It is not a browser test and does not prove Supabase permissions, current stock correctness, prices at order time, payment-provider behavior, or admin product upload. Run the local typecheck, lint, build, existing smoke suite and targeted browser/UAT flows before pushing.

## Required local UAT

1. Search `epoxy`, an exact SKU, a brand, and a variant name.
2. Select categories and confirm counts remain consistent across categories.
3. Combine category + search + in-stock filters; clear filters.
4. Sort all four ways and inspect sale/variant prices.
5. Test active/inactive variants and out-of-stock products.
6. Add two variants of the same product and confirm the cart keeps them distinct.
7. Refresh the page and verify cart persistence.
8. Verify delivery zones, coupon acceptance/rejection, server-side price/stock validation, order creation, payment initiation, return/callback and order confirmation in authorized staging.
9. In admin, create/edit/activate/deactivate a product and upload/reorder images; verify only active products are public.
10. Test desktop, tablet, mobile, keyboard navigation, slow network, Supabase failure and broken image states.
