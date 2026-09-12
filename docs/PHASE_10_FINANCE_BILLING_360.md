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
