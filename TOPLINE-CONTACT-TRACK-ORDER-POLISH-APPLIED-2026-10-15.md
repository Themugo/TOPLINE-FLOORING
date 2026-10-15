# TOPLINE — Contact, Track Order and shared polish: what was applied

Date: 2026-10-15. Foundation: `TOPLINE-FULL-PROJECT-DESIGN-SYSTEM-2026-10-15.zip`. Spec: `TOPLINE-CONTACT-TRACK-ORDER-COLOR-AUDIT-2026-10-15.md`.
No database, migration, route, data-loading or business-logic change. Presentation only.

## Contact (`src/pages/contact.tsx`)
- Hero pill: retired champagne → lime `#C8F26A`.
- Fields: border `#868D95` (3.4:1), petrol focus border and ring, placeholder and counter ≥ 5.4:1.
- Icons, tiles and links: one rule, petrol `#0E6B78` on petrol-50 tile; hover petrol-600 `#0B5864`.
- Cool greys → warm concrete (`#DDD9D2`, `#CFCAC1`); asterisks `text-red-700`; submit hover `#0A2548`.
- Removed the duplicate "Visit our location" card (address and directions already in "Office and showroom").

## Track Order (`src/pages/track-order.tsx`)
- Hero pill lime; hero haze petrol instead of grey-blue.
- Fields: same border, focus and placeholder treatment as Contact.
- Links hover petrol-600 (no more grey fade); outline button, track and dividers on warm concrete.
- Progress: completed stages petrol, pending labels `slate-500`.
- Status tiles: delivered = success token, dispatched/in transit = petrol info tile, cancelled/failed = danger token.
- Payment status is a chip: paid = success, pending/other = warning amber `#854D0E` on `#FFFBEB`, failed/refunded = danger.
- Removed the duplicated privacy box in the lookup column (hero card and form helper already say it).

## Other pages and shared styles
- `index.css`: page background wash was champagne on every page → petrol/navy; `.ring-premium` and `.page-hero::after` fallback aligned to petrol/lime.
- `Header.tsx`: shadows use the new navy; focus ring petrol; tagline neutral slate.
- `services.tsx`, `service-detail.tsx`, `home.tsx`: remaining champagne pills and hero subtitle → lime; focus rings and icons petrol; About-section glow emerald → petrol.
- `about.tsx`: value tiles were green, sky and slate (three unrelated colours) → petrol, navy, deep navy.
- `RecentProjects.tsx`: grey icon → petrol.

## Checks run here
- TypeScript syntax parse of all 8 edited files: clean.
- `verify-track-contact-workflows` 15/15, `verify-public-tracking-contract`, `verify-public-order-tracking-privacy`, `verify-admin-feedback-contract`, `verify-theme-unification` (10/10 contrast pairs): pass.
- New `npm run verify:contact-track-palette`: passes (guards against the retired colours returning).

## Not run
- `npm ci`, typecheck, lint, Vitest and the Vite build could not run here (no dependencies installed, no network for the registry). Run `npm ci && npm run typecheck && npm test && npm run build` before deploying.
- No browser was available. Look at Contact and Track Order at 375 px and 1280 px, including the form-error state and a tracked order in each status.
- Remember Admin → Theme → "TOPLINE Ocean & Lime" → save, or a stored theme can override these defaults.
