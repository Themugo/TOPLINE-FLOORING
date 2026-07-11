# Deployment Guide — Topline Flooring

## 1. Apply the database migrations

Your Supabase project already has migrations 001–005 applied. Two new
migrations fix the security gaps and clean up leftover data:
- `20260707090000_006_security_hardening.sql` — real admin auth + correct RLS
- `20260707093000_007_drop_admin_settings.sql` — carries over any
  site name/contact info you'd saved into `site_settings`, then drops
  the now-unused `admin_settings` table

Apply them with either:

**Supabase CLI (recommended):**
```bash
supabase link --project-ref kxwfyemiuqpnkmwpucda
supabase db push
```

**Or manually:** open the Supabase Dashboard → SQL Editor → run
`006_security_hardening.sql`, then `007_drop_admin_settings.sql`, in
that order.

After running 007, open Admin → Site Settings and re-enter your business
hours — that one field couldn't be safely auto-migrated (see the
migration's comment for why) and needs a 30-second re-entry.

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

## 10. Known lower-priority cleanup (not blocking deploy)

- ~22 `@typescript-eslint/no-explicit-any` lint warnings across admin
  pages (style only, doesn't affect behavior or the build).
  Non-critical: it's stray `any` typing in scattered admin pages, not a
  security or functional issue.
- The main JS bundle is ~520KB; consider code-splitting admin routes
  later if load time matters to you.
