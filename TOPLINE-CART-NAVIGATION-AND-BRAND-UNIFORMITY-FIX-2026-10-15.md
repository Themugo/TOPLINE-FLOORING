# TOPLINE Cart Navigation and Brand Uniformity Fix — 2026-10-15

## Scope
- Make the Shop “Add to Cart” action add the selected purchasable product/variant and then navigate directly to `/cart`, so the customer receives a visible result rather than only a transient button label.
- Explicitly set the product action button to `type="button"` to prevent accidental form submission if its surrounding markup changes later.
- Reuse the exact `/topline-brand-mark.svg` asset used by the navbar in the footer, with the same Topline wordmark, descriptor, and brand colors.

## Preserved
- Existing cart reducer and shared `CartProvider`.
- Product purchasability checks, active/default variant selection, product IDs, and variant IDs.
- Existing `/cart` route, checkout behavior, price calculations, and payment flow.
- Existing brand asset; no duplicate logo asset was introduced.

## Verification status
- ZIP integrity and targeted static assertions were checked after packaging.
- The Windows Vitest suite, TypeScript check, lint, and production build have not been run against this new package yet. Run them in the existing Windows checkout before treating the changes as fully certified.
