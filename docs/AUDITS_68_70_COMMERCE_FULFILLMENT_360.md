# Phases 68–70 — Commerce Fulfillment 360

This initiative closes the remaining end-to-end storefront integrity gaps across product selection, cart state, checkout, inventory reservation, payment consumption, and reservation expiry.

## Scope

- Variant-aware customer cart state and checkout payloads.
- Server-authoritative variant pricing and stock validation.
- Aggregate duplicate cart lines before inventory checks.
- Variant-aware inventory reservations and payment consumption.
- Exact reservation-to-stock conversion on final payment.
- Reservation expiry that cancels unpaid orders and releases coupon usage.
- Static contract verification and CI protection.

## Safety boundary

No production Supabase migration is pushed by this initiative. No payment provider is activated and no DNS/WordPress/email infrastructure is changed.

## Acceptance criteria

1. Existing production build baseline remains intact.
2. Lint and TypeScript remain release blockers.
3. Checkout cannot reserve more stock through duplicate lines.
4. Variant stock and pricing are resolved on the server.
5. Final payment consumes the exact reserved variant/product stock.
6. Expired unpaid reservations cannot remain indefinitely as active orders.
7. All initiative contracts are validated in CI.

## Release process

The initiative is released only after the repository end-to-end validation command passes lint, TypeScript, production Vite build, and all existing commerce/security gates. Production Supabase migration deployment remains a separate controlled step.
