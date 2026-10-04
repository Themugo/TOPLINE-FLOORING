# Vercel / CLI / CI Production Audit — 2026-10-03

Input: `TOPLINE-FLOORING-main__14_.zip` (112 migrations). Method: install, typecheck, lint, build and verify the repo as uploaded; replay all migrations on a scratch PostgreSQL 16 with a Supabase shim; run role-based behaviour tests; inspect Vercel, Supabase CLI and CI configuration. Nothing was run against your live Supabase or Vercel projects.

## Failures found in the uploaded repo, and the fixes

| # | Where it fails | Cause | Fix |
|---|---|---|---|
| 1 | **Vercel build** (`npm run build`) | `src/pages/portal.tsx` had four extra `</div>` closings after wrappers were converted to `<button>`; the JSX did not parse | Removed the stray closings; file parses, typecheck clean |
| 2 | **Vercel build** | `src/index.css`: `@apply group` inside `.customer-intent-card`. Tailwind cannot `@apply` the `group` marker | `group` moved to the four home-page cards' `className` |
| 3 | **`supabase db push`** | Two migrations shared version `20260930190000` (`schema_migrations` primary key collision) | Removed the redundant `project_document_vault_360` migration; its table and policies are provided by `20260930180000_project_documents_private_storage.sql` |
| 4 | **`supabase db reset` / CI replay** | `20261001110000_catalog_product_service_upload_integrity_360.sql` constrained `product_variants.cost_price`, a column moved to the staff-only `product_cost_prices` table | Constraints installed by one idempotent block that skips missing columns and leaves a constraint NOT VALID (with a notice) if existing rows violate it, instead of aborting the deployment |
| 5 | **Storage security** | `20260930193000_private_document_policy_overlap_hardening.sql` described scoping the old media/customer policies away from `projects/` but its project policies did not match the app's upload flow | Rewritten: customer/media policies exclude `projects/`; project policies require `projects.*` permissions, an existing project folder, and (for update/delete) a metadata row; the uploader can remove its own unregistered object so a failed metadata save can be rolled back. Read is deliberately not gated on the metadata row: Storage evaluates SELECT on the freshly inserted row, so gating breaks every upload (proven in a rolled-back test) |
| 6 | **Production edge functions** | Five functions had no `[functions.*]` entry in `supabase/config.toml`; the CLI default `verify_jwt = true` rejects every call with 401: `payment-initiate`, `payment-status` (browser, one-time token), `payment-callback`, `payment-webhook` (providers, secret/HMAC) | Explicit `verify_jwt = false` for those four; `brevo-test-email` explicitly `true` (staff JWT). New verifier checks every function directory |
| 7 | **CI** ("Generated database types contract", `REQUIRE_GENERATED_TYPES=true`) | `src/types/database.ts` did not exist | Generated from the replayed schema with the same library the Supabase CLI uses (postgres-meta): 164 tables, identical on re-generation. Regenerate with `npm run db:types` when Docker is available |
| 8 | **Browser (contact page)** | CSP had no `frame-src`, so the Google Maps iframe was blocked | `frame-src https://www.google.com` |
| 9 | **Security headers** | `script-src` allowed `'unsafe-inline'` and `'unsafe-eval'`. The built `dist` has no inline scripts and no `eval` | Removed both; added `object-src 'none'`, `upgrade-insecure-requests`, HSTS. Verifier fails if either is reintroduced or an iframe origin is not allowed |
| 10 | **Payment return page** | Polling counter was React state captured by a closure, so it never advanced past 1: the page polled `payment-status` every 3.5 s forever | Local counter; stops after 40 polls and shows the existing "taking longer" message |
| 11 | **Sitemap** | Listed `/portfolio/<slug>` URLs; the app has no such route (soft 404s for crawlers) | Project URLs removed; verifier checks every dynamic sitemap pattern has a real route |
| 12 | **Public content** | Fabricated per-service feature lists and an unsupported "10-Year Warranty" claim on the services and portfolio pages | Services show only persisted features; warranty wording points to the written quotation/handover. Service update/delete now fail when no row is affected |
| 13 | **Verifiers** | Hard-coded "111 migrations", a stale manifest count, an assertion that contradicted the Storage design, and a brittle string match on CMS caching | Count derived from disk; manifest corrected to 112; assertions rewritten to test the actual contract |
| 14 | Lint | Two `react-hooks/exhaustive-deps` warnings | Fixed properly (local counter; ref for latest props) |

Also regenerated `migrations.txt` and `docs/DATABASE-MIGRATION-SHA256-2026-10-03.txt` (SHA-256 per migration) for the corrected chain.

## Results (local)
- Migrations: **112/112 apply from an empty database, 0 failures**
- `supabase/tests/security_regression.sql`: passes on the replayed chain
- Code-vs-schema alignment (tables, RPCs, columns): 0 mismatches
- `npm run verify:all`: **115/115**
- `npm run typecheck`: 0 errors · `npm run lint`: 0 errors, 0 warnings · `npm run build`: passes (emits `sitemap.xml`)
- Role tests on the merged chain: anonymous, customer, sales and admin read/write boundaries; storage upload/read/delete by role; cost prices staff-only

## Not validated here (needs your environment)
- Linked `supabase db push --dry-run` against project `zmbsskvnzjdaxuxlauyx`, then the real push
- `supabase functions deploy` for all 15 functions; secrets set (`BREVO_API_KEY`, `TOPLINE_WORKER_SECRET`, M-Pesa and card secrets, `TOPLINE_WEB_ORIGIN` for preview origins)
- Vercel project settings: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (and `VITE_SITE_URL`) for Production **and** Preview; Node 22; domain, DNS, HTTPS, www→apex redirect. Without the Supabase variables at build time the sitemap contains only the static pages and the app fails closed
- Real Brevo send + webhook, payment provider UAT, `supabase test db --local` and `supabase db lint` (need Docker + the Supabase CLI)
- Browser check of the live CSP (maps, fonts, images), then `npm run db:types` against the linked project to replace the replay-generated types

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm ci
npm run verify:all
npm run typecheck
npm run lint
npm run build
supabase link --project-ref zmbsskvnzjdaxuxlauyx
supabase db push --dry-run
supabase db push
supabase functions deploy
git remote -v
git add -A
git commit -m "Fix Vercel build, migration chain, edge function JWT config, CSP and CI contracts"
git push origin main
```
Check `git remote -v` shows `Themugo/TOPLINE-FLOORING` before pushing.
