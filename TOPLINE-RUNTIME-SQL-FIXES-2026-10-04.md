# Runtime SQL audit — 2026-10-04

Builds on `TOPLINE-CONTINUATION-FIXES-2026-10-04.md`. This round executed the database code instead of only reading it: all 115 migrations were replayed on PostgreSQL 16, every PL/pgSQL function was analysed with `plpgsql_check`, and the customer, payment and staff flows were run as real roles. Nothing was run against your live Supabase.

## Defects found and fixed (3 new migrations, now 115 in total)

| Migration | Defect | Impact before the fix |
|---|---|---|
| `20261004100000_fix_customer_portal_data_volatility` | `get_customer_portal_data()` writes `last_login` but was declared STABLE; PostgreSQL rejects the write at call time | That RPC always failed (the portal page itself uses `get_customer_portal_360`, which works) |
| `20261004110000_fix_payment_event_payload_hash` | `apply_payment_provider_event` and `apply_customer_payment_provider_event` hash with `pg_catalog.digest()`, which does not exist (pgcrypto lives in `extensions`, never `pg_catalog`) | **No M-Pesa or card callback could record a payment**. Now uses built-in `sha256()` |
| `20261004120000_fix_runtime_sql_errors` | `min(uuid)` does not exist in PostgreSQL; five unknown-column references in dashboard RPCs | **Every quotation submission failed** (journey trigger on quotations); **every customer sign-up failed** (`prepare_customer_registration` trigger on auth.users); inbound email/SMS/WhatsApp could not be recorded; the communications release gate, customer lifecycle, lifecycle operations, data governance, HSE and quality dashboards raised errors |

Also fixed: the release gate read non-existent columns (`enabled`, `configured`), so it now uses `activation_status`; data-governance request counts were taken from the policies table and now come from `data_subject_requests`.

## New safeguards
- `supabase/tests/runtime_contracts.sql` (pgTAP, rolled back): checkout, provider payment event (apply once, replay is idempotent, customer denied), quotation form, customer sign-up trigger, customer portal RPCs, finance permission, and the six staff dashboards. **Proven to fail on the schema without these fixes** and pass with them.
- `supabase/tests/plpgsql_static_analysis.sql`: fails if any PL/pgSQL function would raise at call time (skips if the extension is unavailable). Proven to list all 10 findings on the unfixed schema.
- `supabase/tests/security_regression.sql` now emits TAP so `supabase test db --local` can read its result.
- `scripts/verify-sql-runtime-safety.mjs` (in `verify:all` and CI): rejects `pg_catalog.digest/hmac`, `min/max` on uuid ids and STABLE functions that write.

## Design note (not changed, needs a decision)
A provider payment that exceeds the outstanding order balance (for example a customer paying twice) raises an exception, which rolls back the whole call including the `payment_provider_events` row. The money is then not recorded anywhere in the database. Consider recording it as an unallocated overpayment for refund or reconciliation.

## Results (local only)
115/115 migrations apply from empty · three SQL test files pass · generated types match the schema · `verify:all` 116/116 · typecheck 0 errors · lint 0 errors/warnings · build passes.

## Apply
`supabase db push --dry-run`, then `supabase db push` (three new migrations). Redeploy no edge functions for this round.
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm run verify:all
git add -A
git commit -m "Fix payment event hashing, quotation and sign-up triggers and eight call-time SQL errors; add runtime SQL tests"
git push origin main
```
