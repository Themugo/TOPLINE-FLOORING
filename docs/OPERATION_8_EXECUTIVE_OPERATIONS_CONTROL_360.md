# Operation 8 — Executive Operations & Control Centre 360

## Scope
Unifies management visibility across commercial lifecycle, project delivery, supply chain, finance, fulfillment, customer lifecycle and communications without creating a second system of record.

## Canonical control flow
Canonical operations → protected server-side executive snapshot → prioritized exceptions → manager drill-down → reconciliation → audited control event.

## Controls
- `get_executive_operations_360(integer)` provides a staff-only cross-operation snapshot.
- `reconcile_executive_operations_360()` records an audited reconciliation event.
- Critical, high and medium exception classes surface finance, delivery, service, supply chain, retention and communications risk.
- Executive metrics are computed from canonical tables; no browser-side aggregation becomes authoritative.
- Executive event storage is non-client-writable.

## UI
`/admin/executive-operations-360`

## Verification
Run `npm run verify:operation-8-executive-operations` and the broader release/DB verification suite. Remote production deployment remains a separate linked dry-run/apply process.
