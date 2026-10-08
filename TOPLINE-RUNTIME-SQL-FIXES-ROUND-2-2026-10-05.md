# Runtime audit round 2 — 2026-10-05

Continues `TOPLINE-RUNTIME-SQL-FIXES-2026-10-04.md`. Everything below was executed on PostgreSQL 16 with all 116 migrations replayed; nothing was run against your live Supabase.

## Defect fixed (migration 116, `20261004130000_allow_queued_customer_communications`)
**No staff member could send a message to a customer.** `queue_customer_message()` logs every message to `customer_communications` with status `queued`, but that table's CHECK constraint allowed only `draft/logged/sent/failed`, so the admin Communications screen failed on every send with `violates check constraint customer_communications_status_check`. The constraint now also allows `queued`. Delivery state stays authoritative in `communication_outbox`.

Also removed a stale overload, `complete_communication_delivery_worker(uuid,text,text)`, which made a 3-argument call ambiguous ("function is not unique"). The edge function passes four named arguments and was unaffected; the 4-argument version covers every caller. Generated types were regenerated for this.

## Test fidelity fix (affects how much to trust earlier local results)
The local replay now mimics Supabase's default privileges (`ALTER DEFAULT PRIVILEGES … GRANT ALL TO anon, authenticated, service_role`). Before, it was stricter than production, which could hide exposed tables. With realistic grants and seeded data I re-measured what each role can see:
- anonymous: products 1 of 2 (active only), `public_projects`, services 1 of 2, design tokens. Nothing else.
- customer: only their own `customers`, `customer_portal_access`, `orders`, `order_items` rows, plus the same public data.
- sales staff: leads, customers, orders, quotations, communications and own staff profile; no other staff rows.
- Selecting from all 164 tables and views as admin, anonymous and customer raised no errors other than permission denials, so no view or policy is broken.

## Worker pipeline verified end to end (service role)
Staff enqueue → claim → delivery attempt (started, accepted) → complete → Brevo `delivered` and `hard_bounce` events → inbound email, inbound SMS (unknown sender, then replay, which returns the same row) → automation job lock → reservation expiry → communications and payment reconciliation → payment release gate. All run without errors. The runtime contract test now covers this pipeline; it fails without migration 116 and passes with it.

## Results (local only)
116/116 migrations apply from empty · three SQL tests pass · `verify:all` 116/116 · typecheck 0 errors · lint clean · build passes.

## Still open
- Decision: provider payments that exceed the outstanding balance roll back the whole call, including the provider event row (see previous report).
- Decision: project budget JSON vs. the cost ledger.
- Your environment: `supabase db push --dry-run`/`push` (4 new migrations since the last push), function deploy and secrets, Vercel env vars, domain/DNS/HTTPS, real Brevo and payment provider tests.

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm run verify:all
git add -A
git commit -m "Allow queued customer communications; drop ambiguous worker overload; extend runtime SQL tests"
git push origin main
```
