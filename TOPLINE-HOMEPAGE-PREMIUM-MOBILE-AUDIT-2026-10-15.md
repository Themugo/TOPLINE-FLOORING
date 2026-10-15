# TOPLINE Homepage Premium & Mobile Audit — 15 October 2026

## Foundation and constraints

- Source foundation: the latest TOPLINE full-project package carrying the Ocean/Lime brand and Contact/Track Order contrast correction.
- Preserve the homepage hero section's exact responsive dimensions: `h-[30rem] min-h-[30rem] sm:h-[32rem] lg:h-[35rem]`.
- Preserve the existing CMS-driven homepage, live products/services/projects, pricing, cart, quotation, tracking, account, settings, and database contracts.
- Do not introduce mock products, invented business claims, or unrelated imagery.

## Findings and corrections

1. **Hero carousel mixed sources even when CMS slides were configured.** Previously, product and service slides were always appended to curated CMS slides. This could cause an administrator's curated hero to rotate into extra catalogue items unexpectedly. Configured CMS slides are now authoritative. Real product/service records are used as a fallback carousel only when no CMS hero slides are configured.
2. **Catalogue fallback slides could fabricate image association.** Previously, a product without its own image received a generic placeholder and could be presented as a featured product image. Product/service fallback slides now require both their own image URL and a valid slug/route.
3. **Hero slide index could become stale when live data changes.** A bounded reset returns to slide zero when the available slide list shrinks.
4. **Mobile hero typography and actions needed more deliberate scale.** Mobile heading uses a compact responsive size and balanced wrapping; body copy and spacing are smaller on narrow screens; the primary CTA uses the official Signal Lime `#B4E33D` with Ocean text `#0C2D57`.
5. **Side arrows could overlap hero copy on phones.** Previous/next arrows are hidden below the small-screen breakpoint; swipe and slide indicators remain available. Desktop controls remain visible.
6. **Intent shortcuts were a one-column mobile stack.** They now use two columns on phones with tighter card spacing and smaller text, reducing vertical scroll while keeping the four existing routes and labels.
7. **Reduced motion and focus treatment.** Added reduced-motion transition overrides and retained explicit focus indicators.

## Deliberately unchanged

- Hero section dimensions and card/hero size.
- CMS title, subtitle, image, overlay, interval, and CTA controls.
- Products, services, projects, testimonials, partners, pricing, cart, checkout, quotation, and tracking business logic.
- Site information architecture and navigation.
- Existing service/product fallback pools outside the hero slide selection logic.

## Validation

- Added `scripts/verify-homepage-premium-mobile.mjs` and integrated it into the existing `verify:all` automatic `verify-*.mjs` discovery.
- Static homepage/mobile verifier: expected 12 checks.
- Existing full verifier suite should be run in the Windows repository after applying the ZIP.
- This packaging environment did not have `node_modules`; TypeScript, lint, smoke tests, production build, and real-browser checks must be run locally before commit/deployment. Static source checks are not a substitute for a mobile browser review at 320px, 360px, 390px, 412px, and desktop width.
