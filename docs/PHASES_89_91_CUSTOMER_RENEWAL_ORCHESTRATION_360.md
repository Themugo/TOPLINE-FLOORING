# Phases 89–91 — Customer Renewal Orchestration 360

## Scope
Turn active preventive-maintenance plans into a server-authoritative renewal pipeline while keeping `customers`, `maintenance_plans`, and communication infrastructure canonical.

## Delivered
- Renewal opportunity and audit-event tables with RLS and authenticated staff SELECT only.
- Atomic opportunity refresh for active plans due within 60 days or overdue.
- Priority calculation: critical overdue, high within 14 days, normal otherwise.
- Staff-authorized lifecycle transitions with terminal-state protection.
- Server-side operational snapshot for renewal pipeline metrics and customer/plan context.
- Renewal history RPC.
- Admin Customer Renewals route at `/admin/customer-renewals`.
- Regression-safe static verifier and package script.

## Security
All mutations use `SECURITY DEFINER` RPCs with `private.require_staff_permission('customers', ...)`; direct table mutation remains unavailable to authenticated clients. RPCs use explicit `search_path=public,private` and are revoked from PUBLIC/anon.

## Verification
`node scripts/verify-phases-89-91.mjs` passes. Migration timestamps are unique and strictly ordered. This initiative does not apply migrations to the remote production project.
