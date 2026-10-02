# Implementation Report — Round 6: margin protection and coupon hardening (2026-10-01)

## Fixed
1. **Cost prices were public (migration #95).** `products.cost_price` and `product_variants.cost_price` were readable by anyone via the API. Nothing in the app, RPCs or edge functions used them, so the values moved to a staff-only table `product_cost_prices` (RLS on `catalog` permission, audit trigger) and the public columns were dropped. Existing non-zero values are copied first. Tested locally with a seeded cost value: preserved; anon gets "column does not exist"/"permission denied"; admin sees it; sales and ordinary signed-in users do not.
2. **Coupon code guessing (migration #96).** `validate_coupon` is callable without login. Failed lookups are now counted per caller (X-Forwarded-For, else user id) and blocked after 10 failures in 10 minutes. Successful validations are never counted. Tested: valid code works; after 10 bad guesses the 11th is blocked; the failures table is not readable by clients. Note: a blocked caller cannot validate a valid coupon until the 10-minute window passes.
3. Verifier `verify-database-read-boundary.mjs` extended: fails if code references `cost_price`, if the migrations are missing, or if the throttle/search_path are removed.

## Checks (local)
Migrations: 96/96 apply from an empty database · verify:all 94/94 · typecheck pass · lint pass · build:all pass.

## Apply order in Supabase (important)
#90 project_documents → #91 staff read of inactive rows → #92 project_templates → #93 close legacy public read (needs #91) → #94 projects columns → #95 cost prices → #96 coupon throttle. `supabase db push` applies them in timestamp order, which is correct.

## Still open
- Signed-in customers can still read other public tables' internal-looking columns only if such columns exist; the sweep found none besides those fixed. Re-check after any new column is added to a public table.
- Project budget JSON (`expense_items`) still duplicates the cost ledger; decide which to keep.
- Edge functions not executed (no Deno). Real Brevo, Vercel/DNS/HTTPS, payment UAT, `npm run db:types` still pending.

## Commit/push (cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git remote -v
npm run verify:all
git add -A
git commit -m "Move product cost prices to staff-only table; throttle coupon guessing"
git push origin main
```
