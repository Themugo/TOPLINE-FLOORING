# Phase 4 — Real SMS + Customer Notification Operations

## Objective

Make Topline's customer notification system production-operational rather than simply API-capable. Email and SMS are queued through the existing communication outbox, automatic customer lifecycle events are routed through configurable rules, SMS delivery is tracked through Africa's Talking delivery reports, and customer channel preferences are respected.

## Production architecture

```text
Business event
  -> notification event
  -> notification rule
  -> customer channel preference
  -> communication_outbox
  -> deliver-communications Edge Function
  -> Brevo / Africa's Talking
  -> provider response
  -> delivery state / provider reference
  -> SMS delivery callback (Africa's Talking)
  -> delivered / failed / rejected / expired
```

## SMS provider

Africa's Talking is the initial Kenya SMS adapter. The application uses server-side secrets only:

- `AT_USERNAME`
- `AT_API_KEY`
- `AT_SENDER_ID`

The initial API response is treated as provider acceptance/submission, not final handset delivery. Africa's Talking documents asynchronous delivery reports for the final state.

## Notification rules

The following operational event families are configurable in `notification_rules`:

- quotation status
- order status
- project status
- invoice status
- payment received
- site visit scheduled/rescheduled

Email and SMS can be enabled independently per event type.

## Customer preferences

`customer_notification_preferences` separates transactional channel controls from marketing opt-in controls. Defaults are transactional email/SMS/WhatsApp enabled and marketing channels disabled.

## Idempotency

Automatic event notifications use a deterministic `dedupe_key` so a repeated database trigger cannot send the same notification twice.

## SMS delivery state

The outbox records both the application delivery state and the provider's asynchronous delivery state. `sent` means the provider accepted the message; `delivered` means the provider reported successful handset delivery.

## Callback security

`supabase/functions/sms-delivery-report` is a public callback endpoint because Africa's Talking must be able to call it. It requires the deployment-specific `AT_DLR_SECRET` and uses the service role only server-side to update delivery state.

## Launch configuration still required

Before real customer SMS can be sent:

1. Create/verify the Africa's Talking production application.
2. Obtain/approve the Topline sender ID as required for Kenya.
3. Configure `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` and `AT_DLR_SECRET` as Supabase secrets.
4. Deploy `deliver-communications` and `sms-delivery-report`.
5. Register the SMS delivery callback URL with Africa's Talking.
6. Run a controlled test to a Topline-owned number.
7. Confirm API acceptance and final delivery report separately.

Africa's Talking documents sender ID requirements, callback URLs, and the distinction between initial send status and final delivery status.


## Worker endpoint secret
The communications Edge Function requires the `TOPLINE_WORKER_SECRET` server secret and matching `x-topline-worker-secret` request header. Never expose this value through `VITE_*` variables or browser code.
