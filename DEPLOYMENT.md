# Deployment Guide — Topline Flooring

## 1. Apply the database migrations

Run every file in `supabase/migrations/` **in filename order** (the
timestamp prefix is the order) against your Supabase project. If you're
starting fresh, run all of them. If you've already applied some, only
the ones after your last-applied file are needed - they're all written
to be safe to re-run (idempotent) if you're ever unsure.

Current full list, in order:
```
001_initial_schema.sql
002_seed_data.sql
003_production_schema.sql
004_services_table.sql
005_create_images_storage_bucket.sql
006_security_hardening.sql            - real admin auth + correct RLS
007_drop_admin_settings.sql           - removes leftover plaintext-credential table
008_business_platform_foundation.sql  - CRM, quotation lifecycle, invoicing, inventory automation
009_homepage_layout_switcher.sql      - homepage layout picker
010_seed_homepage_sections.sql        - makes homepage content actually admin-editable
011_checkout_coupons_delivery.sql     - wires coupons/delivery zones into checkout
012_seed_seo_pages.sql                - makes SEO manager actually functional
013_ensure_images_bucket.sql          - fixes "bucket not found" image upload errors
014_connect_inquiries_to_crm.sql      - auto-creates a CRM lead from every quotation request
015_enrich_product_catalog.sql        - adds SKUs, stock levels & 8 more products across all categories
016_fix_partners_and_gallery_seed.sql - fixes broken partner logos, adds 2 missing services, seeds photo galleries
```

**Supabase CLI:**
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**Or manually:** Supabase Dashboard → SQL Editor → paste and run each
file's contents in order, one at a time.

After running 007 (if you haven't already), open Admin → Site Settings
and re-enter your business hours — that one field couldn't be safely
auto-migrated (see the migration's comment for why) and needs a
30-second re-entry.

## 2. Create the real admin login

Admin auth is now real Supabase Auth (email + password), not a fake
browser flag. Create your admin account one of two ways:

**Easiest — Dashboard:**
Supabase Dashboard → Authentication → Users → Add User → enter an email
and password, tick "Auto Confirm User". That's your login.

**Or — script** (`scripts/create-admin.mjs`), run once from your own
machine using your *service role* key (Project Settings → API):
```bash
SUPABASE_URL=https://kxwfyemiuqpnkmwpucda.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key, from dashboard> \
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD="a-strong-password" \
node scripts/create-admin.mjs
```
Never put the service role key in `.env`, in Vercel, or in git — it
bypasses RLS entirely. Use it only for this one command, then discard it
from your shell history.

Log in at `/admin/login` with that email/password. You can change email
or password later from Admin → Settings.

## 3. Environment variables

`.env` (local dev) already has:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
These are safe to be public — the **anon key is meant to be exposed** in
frontend apps. Now that migration 006 locks down RLS, having this key
public no longer means "anyone can edit the database."

In Vercel: Project → Settings → Environment Variables → add the same two
keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) for Production,
Preview, and Development. Do **not** add the service role key here.

## 4. Deploy to Vercel

`vercel.json` is already configured correctly for a Vite SPA (build
command, output directory, and the catch-all rewrite so client-side
routing works on refresh/direct links).

```bash
npm i -g vercel   # if you don't have it
vercel             # first deploy, follow prompts
vercel --prod      # production deploy
```
Or connect the GitHub repo in the Vercel dashboard for automatic deploys
on push — just make sure `.env` is never committed (it's already
gitignored) and the env vars are set in Vercel's dashboard instead.

## 5. What was actually broken (for your records)

- **Fake admin auth**: login was a `sessionStorage` flag with no
  server-side check — bypassable from devtools with one line, regardless
  of password. Now uses real Supabase Auth sessions (signed JWTs, checked
  by every RLS policy).
- **Open database**: nearly every table granted `anon` (the public key)
  full read + write access, including customer PII (orders, customers)
  and the table literally storing the admin password as **plain text**,
  which the login page also displayed on screen. All fixed — content
  tables are now public-read/admin-write, PII tables are insert-only for
  the public (via a safe RPC) and admin-only for reading, and fully
  internal tables (inventory, coupons, activity logs, etc.) are
  admin-only entirely.
- **Open file storage**: anyone could upload/overwrite/delete files in
  the public images bucket. Now upload/update/delete require an admin
  session; public read is unchanged.
- **Duplicate migrations**: two full copies of the initial schema existed
  in the repo (harmless since they used `IF NOT EXISTS`, but confusing).
  Removed the redundant older copies.
- **Checkout security/robustness**: the 3-step client-side insert
  (customer → order → order_items) required broad table access to work
  and could partially fail. Replaced with one atomic database function
  callable by anonymous shoppers without exposing customer data.
- **Minor**: a few unused-variable lint errors fixed; `pages/checkout-success.tsx`
  exists but isn't wired into any route (dead file, harmless, left as-is
  in case you want it — just note the real success page is
  `order-confirmation.tsx`).

## 6. Business Platform Upgrade (Priority 1) - July 2026

New migration: `20260708100000_008_business_platform_foundation.sql`
Run it the same way as the others (SQL Editor or `supabase db push`).

**What it adds to the database:**
- CRM: `leads`, `lead_notes`, `lead_reminders`
- Quotation lifecycle: `draft → sent → negotiating → accepted/rejected → converted`,
  itemized `quotation_items`, auto-numbering (`Q-2026-0001`), tax/total columns.
  Old status values (`new`/`contacted`/`quoted`/`won`/`lost`) still work - nothing
  was removed, the new stages were added alongside them.
- Invoicing: `invoices`, `invoice_items`, `payments` - auto-numbered
  (`INV-2026-0001`), with a trigger that keeps `amount_paid` and status
  (`draft/sent/paid/partial/overdue/cancelled`) in sync automatically
  whenever a payment is recorded.
- Inventory upgrade: `suppliers`, `purchase_orders`, `purchase_order_items`,
  auto-numbered (`PO-2026-0001`). Receiving goods against a PO
  automatically increases stock and logs an `inventory_movements` entry.
  Placing an order automatically **deducts** stock and raises an
  `inventory_alerts` row when a product drops to/below its low-stock
  threshold - both fully automatic via database triggers, no app code
  needed to keep stock accurate.
- Audit logging: every insert/update/delete on `leads`, `quotations`,
  `invoices`, `purchase_orders`, and `orders` is automatically recorded
  into the existing `activity_logs` table via a generic trigger - nothing
  to remember to log manually.

**What shipped in the UI this pass:**
- **CRM** (`/admin/crm`): full lead pipeline (Kanban by stage), notes,
  follow-up reminders, one-click convert-to-customer.
- **Quotations** (`/admin/quotations`): full lifecycle dropdown, itemized
  line-item editor with live subtotal/VAT/total, **PDF download** (client-side,
  no API key needed), and Convert-to-Order once a quote is accepted.

**Schema is ready, UI is next phase:** Invoicing (`useInvoices`,
`recordPayment`) and Suppliers/POs (`useSuppliers`, `usePurchaseOrders`)
hooks exist and are fully wired to the new tables, but don't have admin
screens yet - the data layer is there so building those pages next is
fast, not a re-architecture.

**Not built this pass (Priority 2 & 3 from the roadmap discussion):**
project management (site visits/scheduling/completion certs), upgraded
reports/analytics, staff roles & permissions, automated email/WhatsApp
notifications, backup/restore tooling. These are real, separate builds -
happy to scope and tackle them next in priority order.

## 7. Photos, Services Admin & Homepage Layouts - July 2026

New migration: `20260709120000_009_homepage_layout_switcher.sql`
Run it the same way as the others.

**What it adds:**
- `theme_settings.layout_style` column (`classic` or `showcase`) - lets
  the admin switch how the homepage's Services and Materials Shop
  sections are arranged, live, no code changes. Go to Admin -> Theme ->
  Homepage Layout to switch.

**Biggest gap closed - Services had zero admin management:**
The `services` table and public Services page existed, but there was no
admin screen for it at all - services could only be changed by editing
the database directly. New: **Admin -> Services** (`/admin/services`),
full CRUD with photo upload/library picker, feature lists, and
show/hide toggle.

**Placeholder images:** any product, service, or portfolio photo that's
missing now falls back to a curated, category-aware stock photo
(`src/lib/placeholders.ts`) instead of a broken image icon or blank box -
applied across Shop, Shop Detail, Services, homepage, and Portfolio.
Real photos always take priority; placeholders only show until the
admin uploads one.

**Photos, centralized:** the existing drag-and-drop `ImageUpload`
component now also has a **"Browse Library"** option, so any photo
already uploaded anywhere can be reused on a different product/service/
project without re-uploading it. Wired into Products, Services, Hero
Slides, and (new) **Project photo galleries** - Admin -> Projects ->
the photos icon on any project row now opens a before/after/progress
gallery manager, which didn't exist before (Portfolio images were
completely admin-unmanageable).

**Not changed:** Homepage Builder's per-section title/subtitle/settings
editor (already existed and still works); this pass focused on the
concrete gaps - services, photo fallbacks, and a real layout choice -
rather than re-doing what already worked.

## 8. Full Homepage Editing Rights - July 2026

New migration: `20260710080000_010_seed_homepage_sections.sql` - run it
after 009, same way as the others.

**The core problem this fixes:** `homepage_sections` had no rows in it
at all, so the Homepage Builder page showed an empty list, and the
homepage itself only ever read one hero setting - every other piece of
text (About paragraphs, section headings, CTA button/link, stats) was
hardcoded directly in the React component, completely unreachable from
admin no matter what the builder appeared to offer. On top of that, the
CTA section's title/subtitle/button were being fetched from the database
but the component had a leftover hardcoded copy that silently ignored
them - so even editing the one part that *did* have a DB row had zero
effect on the live site.

**Fixed:**
- Seeded one row per homepage section, matching exactly what was
  hardcoded before, so turning this migration on causes zero visual
  change - but from this point on, the homepage actually reads these
  rows.
- Wired the CTA section's title, subtitle, button text, and button link
  to the database (previously dead code).
- Homepage Builder (`/admin/homepage`) now has a real editor for the
  **About section**: both paragraphs, the photo (upload or pick from
  Media Library), and the stats row (10+ Years / 500+ Projects / etc,
  add/remove freely).
- Every section now supports a **background image** (in addition to the
  existing background color), settable via the same upload/library
  picker used elsewhere.
- Background color now also has a native color-picker swatch alongside
  the preset dropdown, for any custom brand color.
- Section list now shows a thumbnail of each section's background image
  where one is set, so it's easier to tell sections apart at a glance.

**What admin can now fully control on the homepage without a developer:**
hero slide timing/overlay/transition, which sections show and in what
order, every section's heading/subtitle/background/spacing, the About
text/photo/stats, how many products the shop section shows, and the
CTA's text and destination link.

## 9. Reports, Customers, Coupons/Delivery & SEO - July 2026

New migrations: `20260711090000_011_checkout_coupons_delivery.sql` and
`20260711100000_012_seed_seo_pages.sql`. Run both, in order, after 010.

**Reports dashboard was quietly broken - now fixed:**
- The date range selector (7/30/90/365 days) was computed but never
  actually applied to any query - every view showed all-time totals
  regardless of what you picked. Now genuinely filtered, with a
  previous-period comparison badge on revenue.
- "Active Products" was mislabeled - it counted every active product,
  not low-stock ones. Replaced with a correct **Low Stock Items** count
  (compares each product's stock against its own threshold).
- "Export Report" button did nothing. Now exports a real CSV.
- Added: **Revenue Trend** chart (daily, over the selected range),
  **Inventory Valuation** (stock x price across active products),
  **Outstanding Invoices** (unpaid balance from the invoicing module),
  and a **Quote Pipeline** breakdown using the full quotation lifecycle
  (draft -> sent -> negotiating -> accepted/rejected -> converted).

**Customers page was read-only with no detail view - now a real CRM-lite:**
Search by name/email/phone/company, and click any customer to see their
full history in one place - every order, quotation, and invoice, plus
total spent and outstanding balance.

**Coupons and Delivery Zones were fully manageable in admin but never
touched the storefront - now wired into checkout:**
- Delivery zone selector at checkout, with the zone's fee (or free
  delivery over its threshold) added to the total automatically.
- A working coupon code field, validated server-side via a new
  `validate_coupon` function (percentage/fixed, min order value, date
  window, usage cap all enforced) - checked without ever exposing the
  full coupon list to anonymous visitors. Applying a coupon now also
  increments its usage count atomically so `max_uses` can't be
  over-redeemed by concurrent checkouts.
- The order confirmation page now shows a real receipt (items, subtotal,
  delivery, discount, total) instead of just an order number.
- Removed `checkout-success.tsx`, an orphaned duplicate of the
  confirmation page that no route ever pointed to.

**SEO Manager was completely non-functional - now works end to end:**
`seo_pages` had zero rows (nothing to edit) and, separately, nothing on
the storefront ever read from it even when populated - meta titles/
descriptions never reached an actual page. Fixed both: seeded one row
per main page (Home, Shop, Services, Portfolio, Contact, Quotation), and
added a hook that applies each page's title, description, keywords,
Open Graph tags, canonical URL, and robots directives to the live page.
Product pages use their own name/photo as a smart fallback until you
add a dedicated SEO entry for a specific product.

## 10. Storage Bucket Fix - July 2026

New migration: `20260712080000_013_ensure_images_bucket.sql`

If you saw "bucket not found" errors when uploading images anywhere in
admin, it means migration 005 never actually got applied to your
project, even though later migrations did. This migration safely
creates the `images` bucket (idempotent - does nothing if it already
exists correctly) with the secure, post-006 policy set: anyone can view
images, but only logged-in admins can upload, replace, or delete them.

Run it the same way as the others (SQL Editor or `supabase db push`).
No other steps needed - refresh admin and image uploads will work.

## 11. Brand Colors & Site-Wide UI/UX Pass - July 2026

No new migrations - this was a code-only pass, no database changes.

**Brand colors corrected:** the previous design pass used a near-black
navy as the site's primary dark color, which didn't match your real
brand at all - your actual site uses white backgrounds, a medium blue
(matching the logo ring and nav links) and gold/mustard accents, with no
solid dark sections anywhere. Fixed everywhere:
- Header switched from a solid dark bar to white, with blue nav links
  and gold active/hover states
- Footer switched to a white content area with a solid gold bottom bar
  (matching your real footer)
- Home page's Services section and CTA band, and the page-title banners
  on Contact/Portfolio/Quotation/Services, all switched from dark
  gradients to light backgrounds with gold headings
- The color tokens themselves were redefined so "navy" is now your
  actual brand blue, not near-black - this cascades correctly everywhere
  the token is used

**Admin dashboard was the last piece still dark-themed - now fixed:**
Every other admin page already used a white/light theme, making the
dashboard shell (sidebar, topbar, login page) the one inconsistent
holdout with a dark navy theme. Rebuilt to match: white sidebar, light
page background, white stat/content cards - consistent with the rest of
admin and easier to read for data-heavy screens. The sidebar's 23 nav
items are now grouped (Overview / Sales / Catalog / Marketing / Content
/ Configuration) instead of one long flat list, making the admin panel
meaningfully easier to navigate.

**Reliability gap found and fixed across 7 admin pages:** Categories,
Testimonials, Partners, Hero Slides, Products, Orders, and Inventory
were silently swallowing save/delete errors - if something failed
(duplicate slug, network issue, etc.) the admin got no feedback at all
and had no way to know the action didn't work. All seven now show a
toast on both success and failure, plus proper "Saving..." button states
so it's clear when an action is in progress. Categories/Testimonials/
Partners/Hero Slides/Products also gained proper empty states (a clear
message + call-to-action instead of a blank table) and Inventory's
manual stock adjustment now guards against going negative and uses
proper TypeScript types instead of `any`.

**Mobile bug fixed:** Coupons, Delivery Zones, Projects, and Promotions
had data tables with no horizontal-scroll wrapper, so wide tables would
overflow and break the layout on phones. Fixed on all four.

## 12. Typography, Hero Slider & Storage Fix Follow-up - July 2026

No new migrations - code-only pass.

**Font mismatch found and fixed:** the earlier "premium redesign" pass
introduced a serif display font (Cormorant Garamond), but your real
brand is entirely sans-serif based on your actual site. Swapped to
Outfit (headings) + Inter (body) - both modern, premium, sans-serif,
matching your brand's clean geometric look. This is a global token
change (`tailwind.config.js` + `index.css`), so it applies everywhere
automatically - storefront and admin dashboards alike.

**Typography refined site-wide:** tighter letter-spacing on large
headings, better line-height, a bigger and more impactful hero
headline, and a new "eyebrow label" pattern (small gold tracked-caps
text above section headings) matching your site's own
"OUR CERTIFIED PARTNERS" style - now applied consistently across the
homepage and every page banner (Shop, Services, Portfolio, Contact,
Quotation). The Partners section heading was upgraded from a tiny gray
label to the large gold tracked-caps treatment your real site actually
uses.

**Smoother interactions:** buttons and cards now use a consistent
easing curve and subtle lift-on-hover, instead of default/inconsistent
transitions, for a more premium, tactile feel.

**Hero slider now randomizes shop products and services:** previously
it always showed every service and the same 3 products in the same
fixed order every time. Now it shuffles a random selection of up to 5
services/products (Fisher-Yates shuffle) on each page load, so the hero
stays fresh on repeat visits, while dedicated hero slides (set in Admin
-> Hero Slides) still always show first and in their configured order.

**"Bucket not found" - made self-diagnosing:** if you're still seeing
this on Products or Services image upload, it means migration
`013_ensure_images_bucket.sql` hasn't been run on your Supabase project
yet - **run it now** (SQL Editor, or `supabase db push`). The upload
components now also detect this specific error and show a clear message
pointing at the fix, instead of a generic "Upload failed", so this is
easy to self-diagnose if it ever happens again on a fresh project.

## 13. Design Pass - Header, Trust Bar & Section Polish - July 2026

No new migrations - code-only pass.

**Header rebuilt with a top utility bar** (address, phone, email, social
icons) - this existed on your real site but had been dropped somewhere
in earlier rewrites. Restored it, desktop only (matching typical
practice - it collapses away on mobile where space is tight). The main
nav now has an active-link underline instead of a background pill, and
the header's CTA button was changed from "Login" to **"Request
Quotation"** - admin login moved to a small icon instead of being the
most visually prominent button in your customer-facing nav, which
wasn't serving your visitors. Admin login is still one click away, just
not competing with your actual conversion goal.

**New: Trust/Stats Bar**, placed right after the hero - a dark full-width
strip showing your stats (10+ Years, 500+ Projects, etc.) in large gold
numbers. This reuses the exact same stats data already configured in
Admin -> Homepage Builder -> About section, so there's nothing new to
maintain - it's the same numbers, just given a second, higher-impact
placement immediately after the hero where credibility matters most.
This is additive only; the original stats display inside the About
section is untouched.

**Services section**: added a subtle gold arrow badge that appears on
hover (small premium touch), plus a "View All Services" link below the
grid that was missing - previously the only way to more services was to
use the main nav.

## 14. Invoicing & Suppliers/Purchase Orders - Admin UI Completed - July 2026

No new migrations - the database schema and RLS for these already
existed since the Priority 1 business platform migration; only the
admin screens were missing until now.

**Invoicing** (`/admin/invoices`): create invoices tied to an existing
customer or a one-off name, itemized line editor with live subtotal/VAT/
total, payment recording (cash/M-Pesa/bank/card/cheque/other) with
running balance, PDF export, and full status lifecycle (draft -> sent ->
paid/partial/overdue/cancelled) - the status/balance math is handled
automatically by the database trigger already in place, so recording a
payment always keeps the invoice's paid amount and status correct.

**Suppliers & Purchase Orders** (`/admin/suppliers`): supplier directory
(CRUD), and a full PO workflow - create a PO against a supplier, add
line items (optionally linked to a real product), and mark items as
received. Receiving goods automatically increases that product's stock
and logs an inventory movement via the existing database trigger - no
manual stock adjustment step needed afterward.

## 15. Deeper Gap Audit - July 2026

No new migrations - code-only pass, went looking for places where admin
data still silently didn't affect the live site (the same class of bug
as the Homepage Builder and SEO issues fixed earlier).

**Theme customizer was fully disconnected - now partially wired, honestly:**
Admin -> Theme let you pick Primary/Secondary/Accent colors, fonts,
button style, border radius, and spacing - none of it touched the live
site except the layout switcher built earlier. Investigated properly
before fixing anything: the color system uses 10 different shade
variants per color (light tints for badges, dark shades for text,
mid-tones for buttons), so a naive "override everything with one flat
hex" would have broken the visual hierarchy rather than fixed it.

Built a real HSL-based color ramp generator (`src/lib/theme-engine.ts`)
that takes the admin's one chosen color and generates a proper 50-950
tint/shade scale, then applies it live site-wide (storefront and admin)
via a small runtime stylesheet. **Primary Color and Button Style are now
genuinely live** - change them in Admin -> Theme and the whole site
updates immediately, no rebuild needed. Secondary Color, Accent Color,
fonts, numeric Border Radius, and Spacing Scale are still save-only for
now (wiring them safely needs more design work - the font pairing was
specifically chosen to match your real brand, so making it freely
admin-editable risked reintroducing the earlier mismatch). The Theme
page itself now says exactly which controls are live vs. saved-only,
instead of implying everything works.

**Homepage Builder's product count setting was ignored:** the "Products
to Show" dropdown (3/6/9/12) saved to the database but the homepage
always hardcoded 6 regardless. Now respected.

**Quotations and CRM were completely disconnected:** a customer
requesting a quote never showed up anywhere in the Leads pipeline, even
though both systems existed side by side. An earlier fix added a
one-click "Create CRM Lead" button in Admin -> Quotations as a
deliberate manual bridge (avoiding auto-creating leads from every
anonymous submission). On further thought this undersells what a lead
pipeline is for - requiring a click for every single inquiry just adds
a step rather than actually connecting the two systems. Replaced with
automatic creation: a new `submit_quotation_request` database function
creates the quotation and a linked lead together, atomically, the
moment someone submits the Contact or Quotation page - so every
website inquiry lands in the CRM pipeline immediately with no manual
step. The original manual "Create CRM Lead" button is untouched and
still works - it now only appears for older quotations that predate
this change and don't have a lead yet, so it doubles as a backfill tool.

**SEO Manager couldn't add new pages:** it worked for the 6 pre-seeded
pages but had no way to add an entry for an individual product page.
Added a "New Entry" flow so a product's slug can get its own meta
title/description/OG image, with the product's own name used as a
smart fallback until you do.

**Dashboard didn't reflect the newer modules:** the main Admin
Dashboard's stats and Quick Actions still only referenced Orders/
Quotations/Products - Leads and Invoices (both built in earlier passes)
were invisible from the first screen an admin sees. Added "Open Leads"
and "Outstanding" (unpaid invoice balance) stat cards, and CRM/Invoices
shortcuts in Quick Actions.

## 16. Catalog Population & Real Photo Management - July 2026

New migrations: `20260715080000_015_enrich_product_catalog.sql` (from
an earlier pass - adds SKUs, stock levels, and 8 more products across
every category) and `20260716070000_016_fix_partners_and_gallery_seed.sql`
(this pass - fills what 015 didn't cover). Run both in order.

**Two services actually live on the real site were missing from seed
data entirely** - "Concrete Repair and Protection" and "Roof Coating
and Maintenance" - now added with full descriptions and feature lists.

**Partner logos were broken** - 4 of them pointed at brand websites'
internal asset paths and favicons, which never reliably hotlink and
were rendering as broken images. Cleared so the site's existing
text-fallback (partner name as styled text) shows cleanly instead.

**Product photo galleries, fully admin-manageable** - products only
ever had a single photo with no way to add more from admin, even though
the database already had a proper gallery table (`product_images`)
sitting unused. Added a gallery manager (Admin -> Products -> photo icon
on any row): upload multiple photos per product, each with its own
caption ("the story behind the upload" - e.g. "Applying the second coat
on-site in Westlands"), and mark one as the primary listing photo (which
also updates the product's main image automatically). Seeded a starter
gallery with captions on a few flagship products so there's something
to see immediately.

**Media Library now supports real captions and stories** - every
uploaded file already had `title` and `alt_text` columns, but there was
no way to edit them after upload. Added an edit action (pencil icon on
any file) with a Title field and a Description/Story field, which also
serves as the image's accessibility alt text.

**Products admin form gained two missing fields** that already existed
in the database but weren't editable: SKU and Short Description (shown
on product cards, separate from the full description).

**Confirmed still working:** the hero slider's random selection of
services and products (built earlier) is unaffected by the larger
catalog - it now has more variety to draw from.

**On the image sourcing:** all stock photos reuse the same verified
Unsplash CDN photo set already live elsewhere on the site
(license-safe, no new unverified URLs), just distributed more
thoughtfully across more products. This is starter content only - every
photo, caption, and product is fully editable from admin, and the
galleries/upload tools above are exactly how you'd replace them with
real project photos.

## 17. Known lower-priority cleanup (not blocking deploy)

- ~22 `@typescript-eslint/no-explicit-any` lint warnings across admin
  pages (style only, doesn't affect behavior or the build).
  Non-critical: it's stray `any` typing in scattered admin pages, not a
  security or functional issue.
- The main JS bundle is ~1MB (gzipped ~290KB); the Reports page's
  chart library (recharts) is lazy-loaded into its own ~368KB chunk
  that only downloads when an admin actually opens Reports, so it
  doesn't affect the storefront's load time.
