# Operation 1 — Commercial Lifecycle 360

## Purpose

Converge the complete Topline commercial path into one server-authoritative operation:

**Lead → Customer → Site assessment → Quotation → Acceptance → Order → Project handoff**

## Delivered

- Atomic staff lead create/update/delete RPCs with validation and audit events.
- Idempotent quotation-to-lead linking with customer/quotation context preserved.
- Transactional quotation item add/remove with server-side total and tax recalculation.
- Existing lead conversion and quotation conversion retained as the authoritative order/project handoff.
- Server-side commercial lifecycle snapshot covering pipeline, follow-ups, quotations, visits, customers, orders and projects.
- Dedicated `/admin/commercial-lifecycle` operational surface.
- Sales Command Center converged onto the same snapshot instead of browser-side aggregation.
- Staff direct DML removed for lead and quotation item mutations; public quotation intake remains insert-only.
- Commercial lifecycle audit trail for staff mutations.

## Security boundary

Staff mutations use SECURITY DEFINER RPCs with explicit permission checks and a fixed `search_path`. Anonymous callers do not receive these RPCs. Authenticated direct INSERT/UPDATE/DELETE on `leads` and `quotation_items`, and direct authenticated UPDATE on `quotations`, are revoked by the migration.

## Production deployment

This operation is repository-ready only. The remote Topline Supabase project has not been mutated by this build. Before production deployment, replay the complete migration chain locally, run database tests/lint and generated type checks, then use the linked migration dry-run before `db push`.
