# Phases 74–76 Release Notes

## Commerce Entry-Point Consistency 360

This initiative extends the existing variant-aware checkout foundation across every currently implemented customer product add-to-cart entry point.

### Included
- `useProducts` loads product variants for storefront cards.
- Canonical helpers centralize active variant selection, price, stock and purchasability.
- Shop product cards require/select a variant when variants exist.
- Homepage featured product cards use the same variant contract.
- Related-product cards use the same variant contract.
- Cart identity and totals remain product + variant aware.
- Checkout preserves `variant_id` and remains server-authoritative.
- Checkout displays the authoritative order rejection message returned by the secure order RPC.
- CI and release scripts include a dedicated entry-point contract gate.

### Database boundary
No new migration is introduced. Migration 057 remains the database source of truth for variant-aware reservation, pricing and stock consumption.

### Validation boundary
Static contract validation passes. Full dependency installation, lint, TypeScript and Vite production build must still be run from the user's Windows release environment because dependency installation timed out in the isolated build environment.
