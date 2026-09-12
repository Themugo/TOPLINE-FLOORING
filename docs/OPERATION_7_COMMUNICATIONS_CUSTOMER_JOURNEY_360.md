# Operation 7 — Communications & Customer Journey 360

## Scope
Converges business-event routing, customer communication preferences, durable outbox delivery, provider callbacks, inbound matching and operational reconciliation.

## Canonical flow
Business event → notification rule → customer preference → channel selection → durable outbox → provider adapter → delivery event → inbound response → customer timeline → operational action.

## Controls
- `communication_workflow_events` provides an idempotent routing ledger.
- `queue_customer_notification_for_event` records suppressed/partial/queued routing decisions.
- `update_customer_notification_preferences` supports customer self-service for the authenticated customer and staff support workflows.
- `reconcile_communications_360` releases stale worker locks and reports exhausted/unmatched work.
- `get_communications_customer_journey_360` provides a staff-only server-side operational snapshot.

## Provider boundary
Brevo email, Africa's Talking SMS and Meta WhatsApp remain provider adapters behind the durable outbox. Provider credentials remain server-side only. Queued is never treated as delivered.

## Verification
Run `npm run verify:operation-7-communications-journey` and the broader release/DB verification suite. Remote production deployment is a separate linked dry-run/apply process.
