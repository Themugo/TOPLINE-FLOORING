# Implementation Report — Round 7: end-to-end behaviour audit (2026-10-01)

Method: all 97 migrations applied to a scratch PostgreSQL 16 database (Supabase shim), then each flow was exercised as anon, customer, limited staff and admin. Local only; nothing was run against your live Supabase.

## Defect fixed
**No staff member could record or refund a payment (migration #97).** Seven finance RPCs (`record_order_payment_transaction`, `record_invoice_payment_transaction`, `create_order_refund_request`, `complete_order_refund`, `reconcile_*`) and the read policies on `payment_transactions`, `payment_refunds`, `finance_control_events` require the permission resource `finance`, which did not exist in the RBAC catalogue (it only has `payments`). Result: even owner/admin got "Permission denied: finance.update" and could not read payment records through the API. Proven by replaying the call without the migration in a rolled-back transaction. #97 defines `finance` and grants each action only to roles that already hold the same action on `payments` (owner, admin, finance). After the fix: admin records a payment (order becomes paid/confirmed, stock consumed), replaying the same key is idempotent, overpayment is refused, sales is denied, anonymous is denied.

## Other fixes
- Admin route `/admin/site-content` had no permission entry (any active staff could open it). Now requires `content.select`; verifier fails if any routed admin page lacks an entry.
- **Sitemap never reached production.** Vercel runs `npm run build` (Vite only) and no sitemap was committed, so `/sitemap.xml` would have fallen through to the app's HTML. Added a `prebuild` hook so the sitemap is generated during the normal build; `public/sitemap.xml` is now git-ignored (a local build without Supabase access would otherwise overwrite it with a static-only snapshot). **Vercel must have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set at build time or the sitemap will contain only the 9 static pages.**
- `/.well-known/security.txt` lacked the mandatory `Expires` field; now identical to `/security.txt`.

## Verified working (no change needed)
- Checkout RPC: server-side pricing (client price ignored), idempotent replay, rejects negative quantity, oversell, empty cart, invalid email. Stock is reserved at order time and consumed on payment.
- Order tracking requires order number AND phone; returns no email/phone. Quotation RPC validates name and message length.
- Customer isolation: two portal customers each see only their own orders/items/customer row; cannot update orders, grant themselves staff roles, create staff profiles or insert orders directly.
- Staff isolation: sales cannot write services, products, projects or project documents, cannot read cost prices.
- Project documents: path must sit under the project's own folder, uploader cannot be spoofed, MIME restricted, audit rows written. Storage: only staff with `projects` permission can upload/read/delete `projects/` objects; customers and anonymous cannot; anonymous cannot upload to either bucket.
- Every admin permission referenced by the route guard is held by at least one role. Edge function code in this repo parses cleanly (esbuild); strict type-checking shows only errors that already existed in the original code, none introduced.

## Checks (local)
97/97 migrations apply from empty · verify:all 94/94 · typecheck pass · lint pass · build pass (sitemap now emitted into dist).

## Findings left for your decision
- **CSP** allows `'unsafe-inline'` and `'unsafe-eval'` for scripts. The source has no eval, but tightening needs a browser test of the live site, so I did not change it.
- Duplicate policy sets exist on many tables (`rbac_*` and `staff_*` do the same thing). Harmless; cleanup is optional.
- Order tracking has no rate limit; the order number carries 32 bits of randomness plus the phone, so guessing is impractical but not impossible at scale.
- Project budget JSON (`expense_items`) still duplicates the cost ledger.
- Template phases/expense lines have no editor.

## External gates PENDING
Apply migrations #90–#97 in Supabase (timestamp order is correct; #91 before #93); redeploy the edge functions; set Vercel env vars; real Brevo send/webhook; Brevo domain authentication; Vercel domain/DNS/HTTPS/canonical redirect; payment provider UAT; `npm run db:types`; test on the live site: public portfolio, shop checkout, admin service/project/document flows, and recording a payment.

## Commit/push (cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git remote -v
npm run verify:all
git add -A
git commit -m "Add finance permission; guard site-content route; generate sitemap at build; fix security.txt"
git push origin main
```
