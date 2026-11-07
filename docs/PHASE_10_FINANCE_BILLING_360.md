# Phase 10 — Finance & Billing Operations 360

## Objective
Consolidate invoice lifecycle control, receivables visibility, aging and finance auditability around the canonical `invoices`, `invoice_items` and `payments` tables.

## Delivered
- Invoice lifecycle transition RPC with server-side transition rules.
- Send blocked until at least one invoice line exists.
- Paid transition blocked while a balance remains.
- Overdue transition requires a due date before today.
- Immutable-style invoice event history for operational audit.
- Automatic lifecycle refresh for paid/overdue invoices.
- Finance Operations 360 snapshot with invoice, collection and aging metrics.
- Dedicated admin finance operations workspace.
- Existing invoice status UI now uses the protected lifecycle RPC.
- Finance route added to the protected admin router.

## Security
All lifecycle mutation RPCs require the existing staff permission boundary. `invoice_events` is read-only to authenticated staff through RLS; event creation occurs inside SECURITY DEFINER lifecycle operations.

## Source of truth
Existing canonical invoice, invoice item and payment tables remain authoritative. This initiative adds control/audit projections without duplicating financial ledgers.

## Verification
Run `npm run verify:phase-10-finance-billing-360`, migration integrity, typecheck and build before release.


## Phase 10 hardening addendum — 2026-11-07
- Invoice `partial` transitions now require a positive canonical payment total below the invoice total.
- Invoice `paid` transitions require a positive total fully covered by canonical payment rows.
- Invoice `overdue` transitions require a past due date and a positive outstanding balance.
- Lifecycle changes fail closed when `invoices.amount_paid` differs from the canonical `payments` sum; finance reconciliation must run first.
- Automatic lifecycle refresh recomputes `amount_paid` from payment rows and repairs paid/partial/overdue/sent status drift.
- Finance Operations reporting uses the same `reports:select` permission contract as the Finance Control snapshot and its protected route.
- Lifecycle and snapshot RPCs pin an empty search path; anonymous and PUBLIC execution are revoked, with authenticated execution explicitly granted and staff permission checks retained.
- Targeted hardening verifier: 25/25. Aggregate static verification: 160/160. Staging PostgreSQL replay and role-based finance UAT remain release gates.
