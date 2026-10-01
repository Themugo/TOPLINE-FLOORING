# Implementation Report — Audit Round 4 (2026-10-01)

## Root causes found and fixed
1. **No notification ever reached the screen (app-wide).** `useToast()` kept state per call while only `<ToastContainer/>` rendered toasts, so every "saved" and every error message from ~60 files was invisible. Admins saw forms close or hang with no feedback. `useToast` now uses one shared store (`useSyncExternalStore`).
2. **28 admin writes ignored the database error** and still showed success (projects, promotions, delivery zones, navigation, product brands/documents/images/specifications/variants). Added `src/lib/db.ts` (`dbFailure`, `describeDbError`); every such call now reports the real reason. Updates/deletes also fail loudly when 0 rows change (row-level security otherwise silently filters them).
3. **Fake success paths removed:** hero slides faked a saved record (`slide-<timestamp>`) when the database write failed; project budget edits showed "updated" even if the write failed; site settings reported success regardless. All now report failure and reload real data.
4. **Project templates** were localStorage + hard-coded sample templates with invented budgets and phases. Now database-backed (`project_templates`, migration #92, RLS + audit), no seeded data, no invented phases/splits. **Any templates you liked from the old sample list must be re-entered.**
5. Verifier `verify-admin-feedback-contract.mjs` blocks regressions of 1–4.

## Earlier rounds in this thread (already delivered)
Project documents on private-documents (#90), staff read of inactive CMS rows (#91), shared image uploader without base64 fallback, service form/slug fixes, public service page spinner, delivery worker hardening.

## Checks (local)
verify:all 93/93 · typecheck pass · lint pass · build:all pass. Edge functions not run/type-checked (no Deno).

## Still open
- Template phases/expense lines cannot be edited in the UI (stored as empty arrays); needs an editor.
- Notification read/dismiss state still in localStorage (per-browser UI state, acceptable).
- Remaining admin pages with bare `catch {}` generic messages: suppliers, homepage-builder, invoices, crm, warehouses, seo, testimonials, quotations, products, partners, categories. They now display their (generic) toasts; detail messages not added.
- Portfolio headline metrics need owner approval.
- Services reorder control.

## External gates PENDING
Apply migrations #90, #91, #92 to Supabase; redeploy edge functions; real Brevo send/webhook; Brevo domain auth; Vercel/DNS/HTTPS; payment UAT; `npm run db:types`.

## Commit/push (cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git remote -v
npm run verify:all
git add -A
git commit -m "Shared toast store; surface DB write errors; DB-backed project templates; remove fake success paths"
git push origin main
```
