# Phase 19 — Order Confirmation & Communication Delivery Reliability 360

## Why this phase exists

A source audit found that `20261004120000_fix_runtime_sql_errors.sql` replaced `public.emit_customer_journey_event()` but omitted the call to `public.queue_customer_notification_for_event()`. The order trigger therefore wrote an in-app `notification_events` record without reliably creating the durable customer email/SMS/WhatsApp outbox record. An order could show as completed while no customer confirmation existed to send.

## Changes

- Restored the event-to-outbox call in the final `emit_customer_journey_event()` implementation.
- Kept the existing order, quotation, project and invoice event wiring and canonical notification rules.
- Added safe, exact, unique-email fallback matching for legacy orders with a null `customer_id`; ambiguous matches are not sent to an arbitrary customer.
- Added a staff-only `get_order_communication_delivery_360` RPC and an order-detail panel showing channel, recipient, attempts, provider message ID, error and delivery state.
- The UI explicitly distinguishes provider acceptance from confirmed delivery.
- Registered a focused Phase 19 verifier in npm and GitHub Actions.

## Delivery semantics

`queued` means waiting for the worker; `accepted` means the provider accepted the request; `delivered` requires a provider delivery callback. A completed order is not evidence that its email reached the inbox. The transactional outbox and status event are created inside the same database transaction as the order write. Provider delivery still depends on valid server-side credentials, enabled scheduler/Vault configuration, a deployed Edge Function, and correct Brevo callback configuration.

## External validation required

Apply the migration in staging, place a test order, verify the outbox row and scheduler run, confirm Brevo acceptance and the provider delivery callback, and inspect the recipient inbox/spam folder. Test hard-bounce/invalid-address suppression, duplicate event replay, retry behavior, and an order whose legacy customer link is null or ambiguous. Do not infer provider delivery from an order status or an HTTP acceptance response.
