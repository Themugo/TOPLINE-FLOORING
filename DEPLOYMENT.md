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

## 6. Known lower-priority cleanup (not blocking deploy)

- ~22 `@typescript-eslint/no-explicit-any` lint warnings across admin
  pages (style only, doesn't affect behavior or the build).
  Non-critical: it's stray `any` typing in scattered admin pages, not a
  security or functional issue.
- The main JS bundle is ~520KB; consider code-splitting admin routes
  later if load time matters to you.
