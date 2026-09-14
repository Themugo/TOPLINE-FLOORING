# Payment / Refund / Provider Trust Boundary 360 — Final Report

## Status
**HARDENED — migration applied to dedicated Supabase project `zmbsskvnzjdaxuxlauyx`.**

## Scope
Provider webhook ingestion, payment transaction integrity, refunds, finance RPC authorization, ledger invariants, database constraints and replay/idempotency controls.

## Findings addressed
1. SECURITY DEFINER payment/finance functions were pinned to an empty search path.
2. Provider webhook application was kept service-role-only and tightened to reject unsupported currency and malformed monetary values.
3. Successful provider events now require a provider transaction identifier.
4. Existing provider transaction replays must match order, amount, currency and successful state.
5. Payment ledger totals cannot exceed the order total.
6. Refund totals cannot exceed successful payment totals.
7. Successful refund completion requires provider and provider refund identity.
8. Provider event, transaction, refund and idempotency identifiers are database-bounded.
9. Existing unique provider/event/reference/idempotency indexes remain part of the duplicate-prevention boundary.
10. Existing RLS and staff finance permission boundaries were preserved rather than bypassed.

## Live evidence
- Active migrations: **85**.
- Migration `111_payment_refund_provider_trust_boundary_360` applied successfully.
- Provider webhook function: `search_path=""`, anon EXECUTE false, authenticated EXECUTE false, service-role EXECUTE true.
- Finance mutation/reconciliation functions: `search_path=""`, anon EXECUTE false, authenticated EXECUTE true.
- New payment/refund constraints present in production.
- No pre-existing negative payment/refund values or duplicate provider transaction/refund identities were found before constraint deployment.

## Verification
- Payment/Refund/Provider Trust Boundary 360: **14/14 passed**.
- Full `verify:all`: **87/87 passed, 0 failed**.
- Database dependency contract: **85 migrations, 142 tables, 214 functions, 269 FK references**.
- Migration ordering/timestamp integrity: passed.

## External certification still required
- Real payment-provider sandbox/live webhook delivery.
- Real successful, failed, duplicate and tampered webhook tests.
- Real partial/full refund UAT.
- Production provider credentials and webhook secret verification.
- Local Windows `npm ci`, lint, typecheck and build certification. The container's retained node_modules did not contain the required ESLint executable, so these were **not falsely claimed as passed**.
