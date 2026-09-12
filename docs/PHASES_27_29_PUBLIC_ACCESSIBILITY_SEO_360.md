# Phases 27–29 — Public Accessibility, Discoverability & SEO 360

## Objective
Harden the public-facing experience so the production site is keyboard-accessible, respectful of user motion/contrast preferences, correctly described to search/social crawlers, and protected from accidental indexing of private operational routes.

## Delivered
- Skip-to-content navigation and a focusable main landmark.
- Reduced-motion and higher-contrast accessibility rules.
- Accessible WhatsApp floating action with explicit expanded state and labelled message input.
- Production WhatsApp default fallback aligned to the canonical Topline contact number; placeholder number removed.
- Canonical `en-KE` Open Graph locale.
- WebSite JSON-LD schema tied to the canonical site and publisher organization.
- Static HTML metadata baseline for description, robots, Open Graph and referrer policy.
- Production `robots.txt` with public crawl allowance and private/customer transactional route exclusions.
- Sitemap coverage for public industry and partner routes retained.
- Static source verifier and CI enforcement.

## Verification
`node scripts/verify-phases-27-29.mjs`

The verifier checks accessibility landmarks, motion/focus controls, WhatsApp accessibility/configuration, SEO locale/schema, placeholder-content removal, sitemap coverage, robots policy and static metadata.

## Deployment note
No provider credentials or database secrets are included. The sitemap generator continues to require `VITE_SITE_URL` and can optionally query Supabase for dynamic public slugs.
