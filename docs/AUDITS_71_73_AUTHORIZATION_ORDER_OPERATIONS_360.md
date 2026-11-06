# Phases 71–73 — Authorization Contract Repair + Order Operations 360

## Objective
Repair latent RBAC contract mismatches and give authorized staff one permission-aware order operations snapshot spanning order items, reservations, delivery and finance visibility.

## Completed
- Corrected the staff role join to use `staff_profiles.user_id` and `staff_role_assignments.user_id`.
- Preserved compatibility for legacy RPC calls that request `read` by normalizing it to the canonical `select` permission.
- Repaired the `payment_refunds` RLS policy to use the canonical permission helper.
- Added `get_order_operations_360(uuid)` as a SECURITY DEFINER, permission-aware read boundary.
- Added typed frontend service for order operations and payment reconciliation.
- Upgraded admin Orders from a basic modal to an operational 360 snapshot.
- Corrected stale migration-count error messages.
- Added a dedicated verification gate and CI step.

## Security boundary
Finance transactions/refunds are returned only when the authenticated staff member has the `payments.select` permission. Inventory reservation details require `inventory.select`. The RPC itself requires `orders.select`.

## External validation still required
The repository must still be validated with the project’s normal local Supabase replay, lint, typecheck and production build on a machine with dependencies available. Production migration deployment remains a separate controlled step.
