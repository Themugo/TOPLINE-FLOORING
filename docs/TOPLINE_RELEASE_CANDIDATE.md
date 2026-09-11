# Topline Release Candidate — Phases 57–60

## Objective

Create a controlled release gate before production database deployment, payment-provider activation, or DNS cutover.

## Phase 57 — Environment and target integrity

- The browser build accepts only the dedicated Topline Supabase URL.
- Public configuration contains no server-side payment or Supabase service-role secrets.
- Misconfigured Supabase targets fail closed instead of silently connecting to another project.

## Phase 58 — CI release gate

CI now verifies:

- canonical migration integrity;
- ecommerce stability;
- payment/inventory lifecycle;
- refund and reservation-expiry lifecycle;
- provider webhook boundary;
- release-candidate target/secret checks;
- lint, TypeScript and Vite build.

## Phase 59 — Provider activation boundary

The application remains provider-neutral until the client selects and provisions a real payment provider. No provider credentials are invented or committed. The webhook endpoint remains fail-closed and returns `501` until a concrete adapter verifies signatures and normalizes provider events.

The selected provider adapter must execute server-side and feed the existing controlled payment/refund transaction boundary. Browser success messages are never payment proof.

## Phase 60 — UAT and deployment gate

The following sequence is mandatory before production activation:

1. Install dependencies with `npm ci`.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Start local Supabase and replay all active migrations.
6. Run local database lint/tests.
7. Generate `src/types/database.ts` from the local schema.
8. Run the full static verification suite.
9. Link only to the client-owned Supabase project.
10. Run `supabase migration list --linked`.
11. Run `supabase db push --dry-run --linked` and inspect the complete plan.
12. Apply migrations only after the dry-run is explicitly approved.
13. Configure the selected payment provider in the client's server-side secret store.
14. Test payment success, failure, duplicate webhook, reversal, refund and partial refund in provider sandbox/UAT.
15. Configure trusted reservation-expiry scheduling.
16. Run business UAT for catalogue, checkout, delivery, projects, invoices, customer portal and after-sales.
17. Deploy the frontend.
18. Keep the old WordPress/cPanel site live until cutover approval.
19. Change DNS only after the new system passes UAT and rollback is confirmed.

## Explicit non-goals

- No production `db reset --linked`.
- No payment credentials in GitHub or Vite variables.
- No DNS cutover in this phase.
- No shutdown of the existing cPanel/email infrastructure.
- No claim of production readiness until the external validation sequence above has actually passed.
