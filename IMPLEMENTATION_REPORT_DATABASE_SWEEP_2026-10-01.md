# Implementation Report — Database Clean Sweep (2026-10-01)

## Method (new this round)
Installed PostgreSQL 16 locally, shimmed Supabase-only objects (roles, `auth`, `storage`) and applied ALL migrations in order to an empty database, then tested access as anon / admin / limited-staff / customer roles, and cross-checked every table, RPC and column used by the code against the real schema. Reproducible: `scripts/local-db/README.md`.

## Defects found and fixed
1. **Migration chain did not apply to a fresh database.** `20260913195000_099` revoked privileges on a function before creating it. Reordered (no behaviour change on existing databases). Chain now: **94/94 apply from empty, 0 failures** (includes my migrations #90-94, which had never been executed before).
2. **Inactive/draft data was publicly readable (security).** The canonical schema's `public_read USING (true)` policies were never dropped, so they voided the `is_active = true` rules that were added later (policies are OR-combined). Anonymous visitors could read inactive services, products, projects, promotions, delivery zones, etc. Migration #93 drops them. Verified locally: anon sees 1 of 2 services; admin still sees 2.
3. **Project cost/customer data was publicly readable (security).** Active projects exposed `customer_id`, `order_id`, `estimated_cost`, `actual_cost`, `project_value`, address, team to anyone. Migration #93 makes the `projects` table staff-only and publishes only safe columns through the `public_projects` view; portfolio, home, project detail and the sitemap now use it.
4. **Admin could not create or edit projects.** The form writes `materials_used`, `estimated_budget`, `actual_expenses`, `expense_items`, which did not exist (PostgREST "column does not exist"). Migration #94 adds them (internal; not in the public view).
5. **Other code/schema mismatches fixed:** partners page ordered by non-existent `sort_order` (now `display_order`); navigation update sent non-existent `updated_at`; media auditor read/wrote non-existent `is_compressed/compression_ratio/webp_url` and its "Compress" button wrote a fabricated 65% ratio without compressing anything: button and fake write removed, check now based on file type.
6. After these fixes the checker finds **0** mismatches between code and schema for tables, RPCs and columns referenced in select/filter/insert/update literals.

## Correction to an earlier round
Migration #91 (staff read of inactive rows) was written on the assumption that staff could not read inactive rows. In the real chain they could, only because of the leaky `public_read` policies. #91 was therefore redundant on its own but is **required together with #93**: it is what keeps admin screens working once the leak is closed. Apply #91 before or with #93.

## Verified positives
- No table without RLS; the only anon write grants are contact, lead, quotation and page-visit inserts (with content checks).
- Only six `SECURITY DEFINER` RPCs are callable by anon (checkout, quotation, order tracking, coupon validation, public site content/pages), all with a fixed `search_path`.

## Not fixed (needs your decision)
- **Cost prices are publicly readable:** `products.cost_price` and `product_variants.cost_price` can be read by anyone via the API. Fixing it requires explicit column lists in every public shop query or public views (large change, needs testing against the live shop). Recommended next step.
- `validate_coupon` can be called anonymously with no rate limiting (coupon-code guessing).
- Project budget (`expense_items` JSON) duplicates the authoritative cost ledger (`project_cost_entries`); decide which to keep.
- Edge functions still not executed (no Deno).

## Checks (local only)
verify:all 94/94 · typecheck pass · lint pass · build:all pass · migrations 94/94 apply from empty DB.

## External gates PENDING
Apply migrations #90-#94 to Supabase in order (#91 before/with #93); redeploy edge functions; after applying, test the public portfolio, shop and an admin session; `npm run db:types`; Brevo, Vercel/DNS/HTTPS, payment UAT.

## Commit/push (cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git remote -v
npm run verify:all
git add -A
git commit -m "Close legacy public read policies; public_projects view; align projects schema; fix migration 099 ordering"
git push origin main
```
