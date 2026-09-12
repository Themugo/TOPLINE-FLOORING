# Operation 6 — Customer Lifecycle 360

## Scope
Unifies reactive service, SLA, warranty entitlement, customer feedback, preventive maintenance and renewal into one after-sales control loop.

## Canonical flow
Project completion → warranty → service request → SLA → resolution → feedback → maintenance → maintenance visit → renewal → repeat business.

## Server-authoritative controls
- `reconcile_customer_lifecycle_360()` reconciles SLA escalation, warranty validation, missed maintenance visits and renewal opportunities.
- `get_customer_lifecycle_360(uuid)` provides a staff/customer-scoped lifecycle snapshot.
- `get_customer_lifecycle_operations_360()` provides staff-only portfolio risk metrics.

## UI
Admin workspace: `/admin/customer-lifecycle-360`.

## Deployment
This migration is intentionally not applied to the remote Supabase project by the build package. Validate with local replay first, then use the linked migration dry-run before production deployment.
