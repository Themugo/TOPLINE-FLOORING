# Continuation fixes — 2026-10-04

Builds on `TOPLINE-VERCEL-CLI-PRODUCTION-AUDIT-2026-10-03.md`. While auditing the repo you uploaded I found that several fixes from my earlier rounds were missing from it (the repo was assembled from an older copy plus other sessions' work). They are now in this repo, which is the single canonical version going forward.

## Fixed in this round
1. **Fabricated contact details on public pages.** Contact, home, quotation and the hero slider fell back to `+1 (555) 000-0000`, `contact@example.com` and a fake Commerce City address when Site Settings were empty. They now show only what is configured; empty channels are hidden.
2. **Editing a product erased its brand.** `update_product_admin` overwrites `brand_id` and the form never sent one. Added a Brand selector (preloaded on edit). Product errors now show the real reason instead of "code or web address may already be in use".
3. **A failed load looked like "no results".** `useProducts`, `useProduct` and five sibling hooks treated a failed query as an empty list, so an outage showed "product not found". They now expose the error; the shop and product page show a retry button.
4. **Search text could break queries.** `,` `(` `)` `%` in the shop/admin search were passed into a PostgREST `or()` filter; now stripped.
5. **31 generic admin failure toasts** ("Failed to save…") now include the actual reason (permission, duplicate, session expired, network).
6. **Brevo test email could hang.** The provider call had no timeout and no failure handling; a Brevo outage left the admin button spinning. It now times out after 20 s, records a degraded status and returns 504. A verifier now requires a timeout on every outbound fetch in every edge function.
7. Deleted the unused `src/lib/mock-data.ts`; the verifier that was supposed to catch imports compared file names instead of contents and could never fail. It now reads the sources.
8. Regression guards added to `verify-admin-feedback-contract` (brand preserved, no swallowed errors, no fabricated contact data, no generic catch toasts) and `verify-edge-function-deploy-config` (timeouts).

## Results (local only)
112/112 migrations apply from empty · CI security regression passes · generated types match the schema · `verify:all` 115/115 · typecheck 0 errors · lint 0 errors/warnings · build passes · edge functions parse and add no strict-type errors.

## Still open (needs you or your environment)
- Decision: project budget JSON (`expense_items`) duplicates the cost ledger — which should be authoritative?
- Linked `supabase db push --dry-run`/`push`, `supabase functions deploy`, secrets, Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview), domain/DNS/HTTPS.
- Real Brevo send and webhook round trip, payment provider UAT, Docker-based `supabase test db`/`db lint`, then `npm run db:types` against the linked project.

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git remote -v
npm ci
npm run verify:all
npm run typecheck
npm run lint
npm run build
git add -A
git commit -m "Remove fabricated contact fallbacks; surface load errors; preserve product brand; bound Brevo test call"
git push origin main
```
