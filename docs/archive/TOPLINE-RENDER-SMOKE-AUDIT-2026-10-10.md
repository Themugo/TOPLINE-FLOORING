# Render smoke audit — 2026-10-10

Foundation: `TOPLINE-FLOORING-main-PRODUCTION-FIXED-2026-10-09.zip`. No new migrations (still 116).

## What was added
`npm run test:smoke` (vitest + jsdom + Testing Library, devDependencies only; the production bundle is unchanged). It mounts the real `<App />` for **20 public routes and 68 admin routes** (discovered from `src/App.tsx`, so new pages are covered automatically) against a stubbed Supabase client in two modes: **empty data** and **simulated database outage**. A page fails the test if it throws during render, logs an uncaught error, or leaves an unhandled promise rejection. Admin pages are rendered as a signed-in owner with every permission; the test also asserts the guard let the owner in (not redirected, no "Access restricted"). A deliberately injected crash in `/faq` is caught (negative control). It runs in CI before the Vercel contract step and takes well under a minute.

My first version of the admin test passed vacuously: pages rendered the guard's "Access restricted" screen. Adding the admission assertion exposed that, and the stub was fixed. Worth knowing when reading green results from tests like this.

## Defects found and fixed
1. **Eight data hooks ignored database failures** (`useSuppliers`, `usePurchaseOrders`, `useWarehouses`, `useWarehouseStock`, `useStockTransfers`, `useLeadNotes`, `useLeadReminders`, `useUpcomingReminders`): `try … finally` with no `catch`, so a failed query produced an unhandled promise rejection and a silently empty list. They now catch, keep the list empty and expose `error` like the other hooks.
2. **Financial Command Center** had the same pattern and showed zeros with no message on failure; it now shows the error.
3. **Commercial Lifecycle and Sales Command Center crashed** (`Cannot read properties of null (reading 'leads_open')`) if the RPC returned null. `getCommercialLifecycle360()` now returns `{}` for null.
4. A static guard in `verify-admin-feedback-contract` fails if a data-hook loader has `try/finally` without `catch`; proven to fail on the old pattern.

## Results (local only)
Smoke suite 178/178 · `verify:all` 116/116 · typecheck 0 errors · lint clean · build passes.

## Notes
- `npm ci` needs the updated `package.json` and `package-lock.json` from this zip (new devDependencies: vitest, jsdom, @testing-library/react, @testing-library/dom).
- The stub returns empty/error data only; it proves pages do not crash, not that they show correct data. Real data flows are covered by the SQL tests and the manual checks listed below.
- Still open: provider overpayments roll back the event record; project budget JSON vs. cost ledger; your environment steps (db push, function deploy and secrets incl. `MPESA_CALLBACK_SECRET`, Vercel variables, DNS/HTTPS, real Brevo and payment tests).

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm ci
npm run verify:all
npm run test:smoke
npm run build
git add -A
git commit -m "Add render smoke tests for all public and admin routes; catch failed loads in data hooks"
git push origin main
```
