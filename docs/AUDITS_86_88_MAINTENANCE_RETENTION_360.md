# Phases 86–88 — Preventive Maintenance, Renewal & Customer Retention 360

## Scope
Build a server-authoritative maintenance-plan lifecycle on top of the existing after-sales model.

### Phase 86 — Maintenance Plan Foundation
- Canonical `maintenance_plans` table.
- Customer/project/order relationships reuse existing entities.
- Frequency, start, due and expiry controls.
- Staff-authorized creation through `create_maintenance_plan_360`.

### Phase 87 — Scheduled Maintenance Lifecycle
- Canonical `maintenance_plan_visits` table.
- Staff-authorized scheduling and completion RPCs.
- Past-date, expiry and active-staff validation.
- Completion advances the next due date atomically.
- Terminal plan protection.

### Phase 88 — Retention Operations Surface
- `get_maintenance_operations_360` operational snapshot.
- Due/overdue/expiring metrics.
- Admin maintenance portfolio and upcoming visits.
- Customer-scoped `get_customer_maintenance_plans_360` for future portal visibility.

## Security
- RLS enabled on both new tables.
- No anonymous access.
- Browser mutations are RPC-only.
- Staff permissions are checked server-side with `private.require_staff_permission`.
- Customer portal data is scoped through `get_current_customer_id()`.

## Deployment
No remote database mutation is performed by this package. Apply through the existing local replay and linked dry-run deployment process before production push.
