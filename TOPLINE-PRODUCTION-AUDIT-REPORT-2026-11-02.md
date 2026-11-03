# TOPLINE production audit and completion report — 2026-11-02

## Recent work identified
Latest chain (from the supplied reports): checkout/fulfillment hardening → order payment recovery migration `20261102120000` → guest payment resume on Track Order. All prior reports stated build, typecheck, lint and DB replay were **never run** (no `node_modules`). This audit ran them for the first time.

## Defects found and fixed
1. **Add to Cart crashed on the product detail page** (`src/pages/shop-detail.tsx`): `setLocation` was called but never destructured from `useLocation()`. Typecheck failed (TS2552); Vite builds do not typecheck so the build and all 135 static verifiers still passed. Fixed.
2. **`payment-initiate` could charge a paid/refunded order** and charged the full total on part-paid orders. The reconciliation RPC would later reject the money ("exceeds outstanding balance"), leaving the customer charged with no reconciled order. Fixed: paid/refunded refused, outstanding balance charged.
3. **Double-charge window across idempotency keys.** Keys live in `sessionStorage`; a new session/device/gateway created a second live charge while the first was pending. Fixed with an in-flight guard (bank transfer excluded).
4. Track Order showed the payment-recovery panel for **refunded** orders. Fixed.
5. **Verifier blind spot:** the cart verifier only grepped for the text `setLocation('/cart')`. Added a declaration assertion (shop + product detail); confirmed it fails on the old bug.

## Verification run (this audit)
| Gate | Result |
|---|---|
| `npm run typecheck` | pass (was failing: 1 error) |
| `npm run lint` | pass |
| `npm run build` | pass |
| `npm run test:smoke` (vitest) | 222/222 pass |
| `npm run verify:all` | pass (see final run below) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Edge functions (15) | syntax-checked via esbuild (Deno not available) |
| Migration replay, clean PostgreSQL 16 + Supabase stubs | 128/128 apply (088 needs Supabase's `rls_auto_enable()` helper, which exists on real projects) |
| RLS coverage | 165/165 public tables have RLS enabled |
| SQL tests: security_regression, public_surface_regression, browser_rpc_grants | pass |
| SQL test plpgsql_static_analysis | **skipped** (needs the `plpgsql_check` extension, absent in the scratch DB) |
| Payment reconciliation RPC scenario test | late success recovers failed attempt + consumes stock; stale failure ignored; replay idempotent; tampered replay rejected; anon denied |
| Secret scan | no JWTs/live keys committed; no secret in any `VITE_*` |
| Vercel contract | SPA rewrite, www→apex 301, HSTS/CSP, robots, sitemap all correct; CSP compatible with built `index.html` (no inline scripts) |

## NOT verified (external gates — need your credentials/environment)
- `supabase/tests/runtime_contracts.sql` (needs `pgtap`, not installed here).
- Edge Function behaviour under Deno / deployment of the changed `payment-initiate` (**must be redeployed**: `supabase functions deploy payment-initiate`).
- Applying migrations to the production Supabase project (run `supabase migration list --linked` and `db push --dry-run --linked` first; migration `20261102120000` is additive).
- `VITE_SUPABASE_PUBLISHABLE_KEY` must be set in Vercel (blank in `.env.example` by design).
- Real M-Pesa/card sandbox UAT, Brevo domain/sender authentication and real email delivery, Supabase Auth redirect URLs, DNS/HTTPS on the canonical domain, browser/device click-through.
- Email OTP for guest payment resume is still **not** implemented (documented limitation, not a bug).

## Owner content review (not changed)
`src/lib/cms-defaults.ts` contains placeholder About/team copy ("Since 2012", "15+ years", stock-photo team). The public About page does not render it, but confirm it is not shown anywhere via the admin CMS before launch.

## Files changed
`src/pages/shop-detail.tsx`, `src/pages/track-order.tsx`, `supabase/functions/payment-initiate/index.ts`, `scripts/verify-guest-payment-resume.mjs` (12→16 checks), `scripts/verify-cart-navigation-and-brand-uniformity.mjs`, `docs/commerce/guest-payment-resume.md`, this report. No migration added.

## Deploy commands
```
npm ci && npm run typecheck && npm run lint && npm run build && npm run verify:all
supabase functions deploy payment-initiate
git add -A && git commit -m "Fix add-to-cart crash; harden payment-initiate against double/over-charge" && git push
```

---

# Second audit pass (same day)

## Additional defects fixed
1. **Stale-order replay at checkout** (`src/pages/cart.tsx`): the checkout idempotency key lived in `localStorage` and was not tied to the cart. If an order was created but payment never started (network/gateway error), editing the cart, zone, coupon or contact details and resubmitting made the server replay the *old* order, and payment started against the old items and total. The key is now bound to a fingerprint of the checkout; any change gets a fresh key. The payment key derives from it.
2. **Trailing-slash 404s** (`App.tsx`): `/shop/`, `/cart/`, `/product/x/` etc. now resolve. Product slug parsing is also safe against malformed percent-encoding (previously a candidate crash) and strips query/hash.
3. **Customer portal "Pay Now" shown for refunded/cancelled orders** (`portal.tsx`): hidden (server now also refuses).
4. Order-confirmation id parsing tolerates a trailing slash.

## Audited and found sound (no change)
- `create_secure_customer_order`: prices, delivery, coupon and stock recomputed server-side with row locks; quantity validation; per-email/phone cap of 5 open unpaid orders; idempotent.
- All 7 webhook/callback functions fail closed when their secret is unset and compare secrets in constant time; CORS limited to the two canonical origins.
- Every admin page is routed, all behind `AdminAuthGuard`; unknown `/admin/*` returns 404; no orphan pages.
- No `dangerouslySetInnerHTML`/`innerHTML`, no `console.log`, all images have `alt`, external links carry `noopener`/`noreferrer`.
- Gates: `verify:production-readiness`, `verify:release-candidate`, `verify:doctor`, `verify:generated-types`, `verify:remote-deploy-gate`, `test:release-env-check`, `test:release-safety-guards`, `test:theme-engine` all pass. `launch:check` reports only the expected manual items (production `.env`, provider activation, DB deploy, DNS, UAT).

## Could not be checked
The connected Supabase account contains only CALQULUS PMS and KAYAD EA; the Topline project (`zmbsskvnzjdaxuxlauyx`) is not in it, and Topline must never share a project with CALQULUS. No live project was queried or modified, so applied-migration state, live Supabase advisors and deployed edge functions remain unverified. Run `supabase migration list --linked` and `supabase db advisors --linked` from an authorised CLI session.

## Final gate results (after both passes)
typecheck pass · lint pass · build pass · verify:all 135/135 · smoke tests 222/222.


---

# Third audit pass (broad, root-cause)

## Defects fixed
1. **CSP blocked inlined fonts on every page** (found only by running the built site in a real browser under the exact `vercel.json` headers). Vite base64-inlined small font subsets as `data:` URIs; `font-src` does not allow `data:`, so those glyph ranges silently fell back to a system font. Fixed in `vite.config.ts` (fonts are never inlined), keeping the CSP strict.
2. **Client names published without consent.** `public_projects` exposed `client_name` for every project with `is_active = true` (the default), so any real customer job could appear on the public portfolio under the customer's name. New migration `20261102150000_portfolio_client_consent_and_review_privacy.sql` adds `projects.show_client_name` (default **false**), masks the name in the view unless ticked, and the admin project form has a new "Show client name publicly (client has agreed)" checkbox. **Behaviour change:** existing projects will stop showing a client name until you tick the box for each one you have permission to name.
3. **Anonymous read of `product_reviews.customer_id`** (internal customer UUID) removed via column-level grants (no frontend code reads that table).
4. **Admin could not save two projects with the same title** (unique slug violated) and **editing a title silently changed the public URL**. Slugs are now unique (`-2`, `-3`) and stable on edit (`src/lib/slug.ts`).
5. **Project documents opened in a popup after an `await`**, which Safari/mobile block. The tab is now opened synchronously on click and pointed at the signed URL.
6. **`useProduct` stuck on a skeleton forever for an empty slug** (`/product/`) and could show a stale response after fast navigation. Fixed with an empty-slug guard and a latest-request-wins check.
7. **Incomplete production sitemap** could ship silently if the catalogue query failed during the Vercel build; production builds (`VERCEL_ENV=production`) now fail instead.

## Tests added (behavioural, not source-grep)
- `tests/smoke/checkout-key-and-slug.test.tsx` — 12 tests: checkout key reused only for an identical checkout (qty, items, zone, coupon, phone, address each force a fresh key), order/case insensitivity, storage failure fallback, slug uniqueness and stability. Logic extracted to `src/lib/checkout-key.ts` and `src/lib/slug.ts`.
- `supabase/tests/portfolio_privacy_regression.sql` — consent default, masking, anon cannot read `customer_id`.
- Verifier `verify-guest-payment-resume.mjs` now 19 checks.

## Real-browser verification (Chromium, built site, production headers, Supabase REST mocked)
17 routes load with **no CSP violations and no uncaught errors**: `/`, `/shop`, `/shop/`, `/product/<slug>` (with and without trailing slash), `/product/`, `/cart`, `/track-order`, `/contact`, `/quotation`, `/about`, `/faq`, `/services`, `/portfolio`, `/industries`, `/admin/login`, and an unknown route (404). The add-to-cart flow works end to end: click on the product page → `/cart`, product present and persisted, no page errors. (Network to third-party hosts was blocked in the sandbox, so image rendering from Unsplash/maps was not exercised.)

## Audited and sound (no change)
Communications worker (leased claims, per-message idempotency key, "uncertain" parking for ambiguous sends, exponential backoff, attempt audit); Brevo marketing-sync queue; anonymous read policies on all 36 public tables (each filtered to active/approved/published rows); document manager (rollback on failed metadata insert, row-first delete, 60 s signed URLs, MIME and size allow-list); data hooks (errors surfaced, not swallowed).

## Final gate results
typecheck pass · lint pass · build pass · verify:all 135/135 · smoke 234/234 · `npm audit --omit=dev` 0 vulnerabilities · migrations replay 129/129 on clean PostgreSQL 16 · SQL regression suites pass.

## Still not verified (external)
Live Supabase project (applied migrations, advisors, deployed functions — the connector does not contain the Topline project), `runtime_contracts.sql` (pgTAP), `plpgsql_static_analysis` (plpgsql_check), Deno runtime of edge functions, provider sandboxes (M-Pesa/card/Brevo), DNS/HTTPS, real-device testing, third-party image/map rendering.

## Deploy additions
Apply migration `20261102150000`, redeploy `payment-initiate`, then tick "Show client name publicly" on projects you have permission to name.

---

# Fourth audit pass (accessibility, mobile, SEO — real browser)

Method: built site served with the exact `vercel.json` headers; Chromium (desktop 1280 px and mobile 375 px) over 17 routes; axe-core 4.10 (WCAG 2.0/2.1 A + AA); layout, `<h1>`, title, description and canonical checks. Supabase REST mocked; external hosts blocked.

**Before:** 44 axe violations (38 contrast, 6 unlabeled selects), a 9 px sideways scroll on every desktop page, generic or malformed titles on 7 routes, no `<h1>` on the customer portal.
**After:** 0 axe violations across 34 views, 0 overflow, exactly one `<h1>` and a description on every view, correct titles.

## Defects fixed
1. **Sitewide horizontal scroll on desktop** — the long footer email did not wrap. Footer values now wrap (`min-w-0`, `overflow-wrap:anywhere`).
2. **Page titles were overwritten by the app shell.** `useCMSInitializer` set `document.title` to the bare company name on every CMS update, racing the per-page title (Contact, Services, Home, Track Order, Portal showed a generic title). Removed; `useSeoMeta` owns the title. Fallback titles are now humanised ("Track Order", "Customer Portal", not "Track-order").
3. **Invisible headings** — the global heading colour is navy, so headings on navy sections without an explicit colour were navy-on-navy (1.01:1): the Services call-to-action, the Track Order "We can help with your order" panel, and the service detail call-to-action. Now explicit white.
4. **Low contrast across the site (38 instances):**
   - `text-primary-300` (22 uses) is a mid-blue in this theme because the runtime ramp is generated from a very dark brand navy; moved to `primary-200` (6.0:1 on navy, was 3.5:1).
   - `gray-400`/`slate-400` neutral token darkened `#7b8591 → #66717d` (4.97:1 on white, was 3.75:1); the 8 places where it sat on dark panels were lightened to `gray-300`.
   - "Contact Technical Team" link, service-step numbers, admin-login text, and the quotation guide-rate chip corrected.
5. **Quotation form: 3 selects had no accessible name** (labels were not linked). Linked with `htmlFor`/`id`.
6. **Customer portal had no `<h1>`.** `CardTitle` now accepts an `as` prop (default `div`, so nothing changes visually elsewhere); portal titles are real headings.

## Verified in the browser
- Admin guard: `/admin`, `/admin/orders`, `/admin/products`, `/admin/customers`, `/admin/settings`, `/admin/finance-operations` all redirect to `/admin/login` when logged out; no admin UI is shown and **zero requests to private tables** are made. Unknown `/admin/*` returns the 404 page.
- 17 routes: no CSP violations, no uncaught errors; add-to-cart works end to end (earlier pass).

## Regression protection
`scripts/verify-accessibility-seo-contract.mjs` (10 checks, added to `verify:all`, now 136 verifiers). Confirmed it fails when two of the original bugs are reintroduced.

## Needs your decision (not changed)
- **Hard-coded "Guide Rates" on the quotation page** (`src/pages/quotation.tsx`, `SYSTEM_ESTIMATES`: e.g. industrial screed 2,800 KES/sqm, roof membrane 1,800, concrete sealing 1,100). The page labels the output "Indicative Budget Range", but these are code constants shown to customers. Confirm the figures with Topline or move them into admin-managed settings before launch.
- The neutral palette change is global (gray-400/slate-400). It is a deliberate, small visual change (muted text is slightly darker).

## Limits of this audit
Automated axe-core finds roughly a third of WCAG problems. Not done: keyboard-only and screen-reader walkthroughs, zoom/reflow at 200–400 %, authenticated admin pages in the browser (no test login), third-party map/image rendering, real-device testing.

## Final gate results
typecheck pass · lint pass · build pass · verify:all 136/136 · smoke 234/234 · browser audit 34 views clean.

---

# Pass 5 — Admin console, installable mobile app, mobile navigation

## Admin audit (authenticated, mocked staff session, 68 routes × desktop 1280 + phone 390)
**Before:** 34 of 68 admin pages had no sidebar link (CRM, leads, hero slides, theme, warehouses, coupons, communications…); sidebar scrolled with the page; two items highlighted on prefix routes (e.g. Finance + Finance Operations); drawer had no keyboard/screen-reader support; 83 of 138 views with axe/overflow/heading issues; 4 pages overflowed sideways on phones; guard permission lookup used the raw URL (trailing slash skipped the rule).
**After:** 138/138 views clean (0 axe violations, 0 overflow, 1 `<h1>`, 0 console/page errors, exactly one current nav item). Permission lookup normalised.

## Delivered
- New admin shell (`AdminLayout.tsx`, `admin-nav.ts`, `admin-permissions.ts`, `use-staff-permissions.ts`): all pages grouped and reachable, permission-aware, pinned/independent-scroll sidebar, collapsible remembered groups, filter, accessible quick-navigate (Ctrl/Cmd+K, arrows, Enter), mobile drawer (focus trap, Escape, focus return, scroll lock), skip link, breadcrumbs, per-page tab titles, offline banner, safe-area support.
- Page fixes: contrast (eyebrow accent now guaranteed ≥5:1; low-contrast navy text on 10 pages; white headings on dark panels), unlabeled selects/inputs, heading order, duplicate/empty `<h1>`, sr-only overflow, mobile overflow on site-settings/projects/profitability/specifications, `grid-cols-1` base on 46 admin files.
- Installable app: manifest, icons (incl. maskable + Apple), conservative service worker, offline page, install/update prompts, Vercel headers.
- Mobile: scroll lock + tap-away backdrop on public menu, current-section state and safe-area spacing on bottom bar, scroll-padding under fixed header, tap-delay removal, no sideways overscroll; removed a duplicated route effect in `Header`.

## Verification
typecheck · lint (0 warnings) · build · verify:all 137/137 (new `verify:admin-shell-and-pwa`, 33 checks) · smoke 238/238 (new nav unit tests) · `npm audit --omit=dev` 0 · admin browser audit 138/138 clean · mobile/PWA browser suite 38/38 (SW activates, Chrome reports no installability errors, offline page served, no HTML/Supabase responses ever cached, drawer/menu/quick-navigate/permission filtering) · public site audit 34 views clean.

## Behaviour changes to know about
- Sidebar now hides pages a staff role cannot open (previously showed links ending in "Access restricted").
- Several navigation labels were renamed/regrouped (e.g. "Settings & System").
- `admin/*` pages that render their own heading no longer get an empty second `<h1>`.

## Not verified
Real iOS/Android install and launch, iOS standalone quirks, keyboard/screen-reader walkthrough of every admin form with real data (audits ran against empty-state fixtures), live Supabase, provider sandboxes.

## Pass 6 - communications (email-first), bank/payment details, add-to-cart

**Communications audit.** Email via Brevo is complete end to end (outbox, retry/idempotency, uncertain-delivery handling, suppression, marketing consent sync, Auth SMTP templates). Fixed: the worker previously claimed SMS/WhatsApp rows with no provider configured and failed them; migration `20261102180000` + worker change now claim only configured channels (unconfigured rows wait, cancelled after 72 h). The Brevo webhook accepts header, bearer or `?secret=` authentication and batches; readiness treats SMS/WhatsApp as optional. Activation checklist added to `docs/BREVO-EMAIL-INTEGRATION-RUNBOOK.md`.

**Bank and payment details.** Migration `20261102190000` adds audited, RLS-protected `business_payment_accounts` (bank, Paybill, Till, Send Money, other) with validation, and `get_customer_payment_accounts()`. Admin manager in Business Settings; "How to pay" card in the customer portal; payment-initiate and payment-return use the managed accounts (legacy gateway config remains the fallback).

**Add to cart (public site).** Reproduced in a browser: the click works when a product has stock; products with zero stock (the default for every new product, since the admin form could not record stock) are sent to Request Availability, and the home page button was simply disabled. Fixes: admin product form now records opening / received stock through the audited inventory RPC; the home button routes to a quotation instead of being dead.

**Gates.** tsc clean, eslint clean, build OK, vitest 238/238, verify-all 138/138, SQL regressions pass on a scratch database. Not verified here: live Supabase, Brevo domain/API/webhook, real mailbox delivery, edge function deployment.

## Pass 7 - stock visibility, first paint, icon system

**Product availability.** Products cannot be bought until a stock quantity is recorded (checkout and payment confirmation enforce stock server-side by design). Inventory now has a per-product "Set counted stock" entry (audited movement); status shows "No stock recorded" instead of "Low Stock". A read-only audit query (`TOPLINE-product-availability-audit.sql`) reports every product's real state. Live data was not readable from this session.

**First-frame flash.** Root cause: the hero drew a built-in stock photo while CMS slides/products loaded, then swapped to the real slide (not yet downloaded). Fix: hero shows a branded placeholder until its data has loaded; no stock default is drawn first; index.html paints a branded splash instead of white; the last hero image URL is remembered and preloaded by `/boot.js` (external, CSP-safe) on repeat visits. Verified in a mobile browser with a 700 ms delayed API: placeholder, then the real slide, never a stock image.

**Icons.** Services (spanner) -> layered-surface icon; Shop -> materials box (no longer duplicates the cart); WhatsApp -> real brand mark (new `WhatsAppIcon`) in the mobile bar, chat widget and track-order; Get quote / Contact / Track order / Portfolio use quotation, headset, parcel-search and building icons across the mobile bar, menu, top strip and pages. Footer still uses the generic Twitter glyph for X (not changed). Gates: tsc, eslint, build, verify-all, vitest.

## Pass 8 - navigation master polish

Mobile menu rebuilt: clear hierarchy (Explore / Your orders / Talk to us), 15 px items with 40 px icon tiles, lime active bar, no duplicated entries (quotation, account and tracking each appear once), the quotation action pinned at the bottom so it never needs scrolling, contact details in one tidy card, staff sign-in demoted to a quiet link, short entrance animation (reduced-motion safe), focus moves into the menu on open and back to the toggle on close, desktop links expose aria-current. Bottom bar: larger labels, 52 px targets, active indicator. Verified in a mobile browser at 360, 390 and 768 px: no horizontal overflow, quotation action fully visible, Escape returns focus to the menu button.

## Pass 9 - global brand editor

Audit: the Site Settings logo and favicon were saved under separate `logo` / `favicon` keys the public site never read (editing them did nothing), and the header, footer, admin sidebar, admin sign-in and default hero text hardcoded the logo file, descriptor and slogan; the footer copyright repeated the business name suffix. Fix: one brand source (`src/lib/brand.ts`, `useBrand`, shared `BrandLockup`) stored in the `site_info` row; editor fields for business name, brand name, descriptor, slogan, logo, favicon and a show-text toggle with live preview; header, footer, admin sidebar and sign-in, browser-tab favicon, default hero label and copyright follow it; logos saved under the old keys are carried over. Verified in a browser with default, custom-logo and logo-only configurations. Documented limits (static manifest, installed-app icon, offline page, auth email templates) in `docs/brand-and-site-identity.md`.

## Pass 10 — Navigation master audit (desktop + phone)

Crawled 17 public routes at phone and desktop widths: no page errors, no horizontal overflow, no internal link resolving to 404.

Fixed:
- About, FAQs, Industries and Partners were orphaned; now in the desktop "More" menu, a mobile "Company" section and the footer.
- Footer services all pointed to /services with placeholder names; they now link to each `/service/<slug>`, plus "View all services".
- Admin menu locations (main/footer/mobile) did not match the public site ('header'); `main` is aliased to header, the mobile location now drives the phone menu, and the editor validates link formats.
- Active state is one shared helper (`nav-active.ts`): Services stays lit on a service page, Shop on a product page, Track Order on confirmation.
- External/new-tab links use `rel="noopener noreferrer"` and announce "(opens in a new tab)".
- Tap targets: header search/phone buttons, footer links, social icons, breadcrumbs and 404 links enlarged (phone small-target count: up to ~25 per page before, 0–8 after).
- Router: hash anchors, focus moved to main content and a polite route announcement after navigation; 404 offers Services/Shop/Quote/Contact.
- Staff sign-in demoted to a quiet footer link.

Gates: tsc, eslint, build clean; verify-all 141/141 (new verify-navigation-master 9/9); vitest 238/238. No database changes in this pass.

Remaining (small): inline text links inside page copy and breadcrumb items are ~36px tall on phones; desktop inline links are mouse-targeted. Real-device checks still recommended.

## Pass 11 — Services and shop workflows, end to end

Method: code review of every step (services → service → quotation; shop → product → cart → checkout → payment → tracking), then a scripted browser run against a stateful mock backend at phone (390px) and desktop (1280px): 24/24 checks each, plus failure paths (rejected order, rate-limited quote, variant stock, tracking).

Defects found and fixed:
1. Quote handoffs were dead: product/SKU from the shop and service from service pages were dropped. The quotation now reads `?product`, `?sku`, `?service` and pre-fills (materials enquiry mode needs no area).
2. The quotation's service list was hard-coded and its "Indicative Budget Range" used invented per-sqm rates. Options now come from the service catalogue; the estimator is replaced by a factual "your request at a glance" panel. Prices are quoted by the team after review.
3. `/shop?category=<slug>` (product breadcrumbs, Industries page) was ignored; now applied. Seven Industries cards linked to a meaningless `?type=service`; they now go to /services.
4. Cart stored a permanent snapshot of price and stock. Quantity is now clamped to known stock, the + button stops at stock, and on opening the cart prices/stock/availability are refreshed from the live catalogue with a notice for any change or removal. An empty catalogue answer is treated as inconclusive so a transient read problem cannot empty a cart.
5. After payment the customer saw no order number. The payment-return page now shows the order number, lines, totals and a "Track this order" link (prefilled order number).

Gates: tsc, eslint, build clean; verify-all 142/142 (new verify-services-shop-workflows 11/11; verify-customer-commerce-pages updated for the removed estimator); vitest 238/238. No database changes.

Not covered: real gateway callbacks (M-Pesa/card), real inventory data, real devices. `/checkout-success` is no longer used by the live flow (harmless).

## Pass 12 — Final sweep of remaining areas

Scope: everything not yet exercised end to end — comparison, search, contact, FAQ, About/Industries/Partners/Portfolio, CMS pages, unknown-URL handling, home buttons, customer portal (signed in, populated and empty accounts, register/forgot/bad credentials), and all 138 admin views at desktop and phone widths. Scripted browser runs at 1280px and 390px against a mock backend.

Defects found and fixed:
1. **Product comparison was dead**: nothing added products to it, the bar was never mounted and state did not sync inside a tab. Added a Compare toggle on shop cards and product pages (max 4, aria-pressed, "comparison full" message), shared in-tab state, and a bar that sits clear of the mobile action bar and the floating WhatsApp button.
2. **No search on desktop**: the header search existed only below the `lg` breakpoint. It now works at every width and Escape closes it.
3. **Portal showed a raw JavaScript error** ("Cannot read properties of null…") and hid all orders when an account had no saved preferences. Ancillary data is now null-safe; load failures show a plain message instead of internal text.
4. Portal phone/name/email fields now use proper input types and autocomplete (telephone keypad on phones).
5. Contact: confirmation now stays on the page (not only a fleeting toast).
6. Home product buttons name the product for screen readers and meet the 40px touch target.
7. **Unverifiable claims removed from default copy**: "For over 10 years", "Over 10 Years of Excellence", "Certified Partners", "certified engineers". Defaults are neutral; state exact claims in the site editor if they are accurate.

Admin: 138 views rendered at both widths, no page errors; two "no shell" flags were load timing and passed when re-run alone.

Gates: tsc, eslint, build clean; verify-all 143/143 (new verify-final-sweep 9/9); vitest 238/238. No database changes.

Not verifiable from here: live data, payment-gateway callbacks, email delivery, real devices. Product and service URLs enter the sitemap at build time, so redeploy after adding catalogue items.

## Pass 13 — Payment details save + portal dashboard (2026-11-03)
- **Payment details not saving:** RLS on `business_payment_accounts` required `settings:insert` / `settings:delete`, which were never seeded (only select/update existed), so every save was rejected. Migration `20261103100000` seeds both and grants them to owner/admin. The admin form also now shows the real database error (Postgrest errors are not `Error` instances, so the message was previously dropped).
- **Portal "We couldn't load your dashboard":** signed-in accounts with no `customer_portal_access` row (staff/owner logins, accounts created before the link trigger, late verification) hit "Customer portal access is not available". New `claim_customer_portal_access()` binds the verified email to its unique customer (or creates the profile) and the portal retries automatically; unverified/conflict cases get specific messages, and unexpected errors show a short reference.
- Verifier `verify-pass13-payment-portal.mjs`; gates: tsc/eslint/build clean, verify-all 144/144, vitest 238/238.

## Pass 14 — Settings audit (2026-11-03)
- **Site Settings (admin) read access lost:** 20261016150000 narrowed `site_settings` public read to `custom_css` and added no staff policy, so the admin page loaded blank and upserts could fail or overwrite real values with defaults. Migration `20261103120000` adds a `content:select` staff read; the page now refuses to save after a failed load and reports the load error.
- **Draft product children hidden from staff:** same migration restores staff read of variants, images, specifications, documents and tag/collection links.
- **Swallowed errors:** 53 admin/portal handlers used `err instanceof Error ? err.message : fallback`, which discards Postgrest/RPC errors (plain objects). New `errorMessage()` helper now surfaces the real reason across 29 files + portal; SEO save also reports the reason.
- **Account settings:** email change now says a confirmation link was sent (the address changes only after confirming).
- Verifier `verify-pass14-settings.mjs`; gates: tsc/eslint/build clean, verify-all 145/145, vitest 238/238.

## Pass 15 — Customer portal and business flow (2026-11-03)
- **Quotation dead end:** customers could view a quotation but not answer it. New `respond_to_customer_quotation()` (owner-only, open statuses `quoted/sent/negotiating`, expiry check, row lock) moves the quote to `accepted/rejected/negotiating`, stamps `responded_at` and appends the customer's note for the sales team; the portal quotation dialog now offers Accept / Request changes / Decline.
- **Draft leak:** `get_customer_portal_360` returned draft quotations and draft invoices; it now hides drafts (and drafts no longer count as outstanding).
- **Claim de-duplication:** mount + auth-event loads share one claim request.
- Verified end to end (browser, desktop 1280 and phone 390, mocked Supabase): auto-claim of an unlinked account, quotation response, empty state, no page errors — 11/11 each. Gates: tsc/eslint/build clean, verify-all 146/146, vitest 238/238.
