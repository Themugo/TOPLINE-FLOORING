# G-06 — Customer communications: real order confirmation UAT

**Status:** OPEN until an actual staging order confirmation is received and provider delivery evidence is reconciled.  
**Provider:** Brevo transactional email.  
**Scope:** Order creation → `order.status` event → durable `communication_outbox` row → `deliver-communications` worker → Brevo message ID → Brevo delivery webhook → outbox delivery state → staff order communication view.

## Safety and acceptance boundary

Run this only against a dedicated non-production Supabase project, a disposable staging order and a mailbox controlled by the operator. Do not send a real customer order, production email, or production credentials. Do not paste API keys, worker secrets, webhook secrets, access tokens or full callback URLs containing secrets into chat, Git, CI logs or evidence files. Do not disable RLS, bypass the outbox, manually mark an order paid, or directly edit delivery state to make the test pass.

A provider HTTP 2xx response or Brevo `messageId` proves provider acceptance only. It does **not** prove delivery to the mailbox. G-06 requires a provider delivery event and the actual message in the controlled inbox (including spam/quarantine inspection).

## Source flow already present

- The Phase 19 migration routes canonical `order.status` events into the durable outbox in the same database transaction as the order change.
- Order confirmation email is transactional and is not suppressed by the customer's optional marketing-email preference. The canonical event rule and valid customer email are still required.
- The delivery worker sends through Brevo's transactional SMTP API, records delivery attempts and provider message IDs, and handles ambiguous sends as `uncertain` rather than blindly resending.
- The provider webhook requires `COMMUNICATION_WEBHOOK_SECRET` and records provider events through a service-role-only RPC.
- The staff-only `get_order_communication_delivery_360(uuid)` RPC exposes per-order delivery evidence without exposing provider secrets or raw provider payloads.

## 1. Prepare isolated staging

1. Confirm the Supabase project ref is the approved staging project and is not the canonical production project.
2. Confirm the current migration history includes the order-confirmation delivery reliability migration.
3. Deploy these Edge Functions to staging: `deliver-communications`, `operations-scheduler`, `communication-provider-readiness`, `communication-provider-webhook`, and the existing staff test-email function if used.
4. Configure Edge Function secrets in the staging project's secret store:
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL`
   - `BREVO_SENDER_NAME`
   - `BREVO_REPLY_TO_EMAIL` (optional)
   - `COMMUNICATION_WEBHOOK_SECRET`
   - `TOPLINE_WORKER_SECRET`
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (managed by the Supabase Edge runtime/project configuration)
5. Verify the sender domain and sender address in Brevo. Confirm SPF/DKIM authentication is valid for the domain. Auth SMTP is a separate configuration and is not required to prove application order email.
6. Configure the Brevo transactional webhook to the deployed `communication-provider-webhook` endpoint. Configure Brevo to present the shared secret using its supported webhook authentication option; the endpoint accepts `x-topline-webhook-secret`, Bearer authorization, or a secret query parameter. Prefer header/Bearer authentication. Avoid query secrets where possible because URLs can be logged.
7. Subscribe the webhook to the transactional email events needed for at least delivered and failure/bounce events. Record the event names enabled in Brevo.

## 2. Check provider readiness

Invoke `communication-provider-readiness` with `POST` and header `x-topline-worker-secret: <TOPLINE_WORKER_SECRET>` from a secure operator environment. It must return HTTP 200 and `ready: true`; `brevo` must show `configured: true`. The response exposes missing key names only, never secret values. A 503 means stop and correct the staging secret configuration before creating the order.

Do not store the request header or secret in the evidence bundle.

## 3. Prove a real order confirmation

1. Use the normal staging storefront checkout flow to create one disposable order. Use a mailbox you control and a test customer identity. Do not insert an order row manually.
2. Capture the order UUID and order number in the private UAT record. Confirm the order has the expected customer email and the initial `pending` status.
3. Confirm the order's `order.status` event has created one email row in `communication_outbox`, with the canonical order dedupe key. Check the associated `communication_workflow_events` row. Do not create or edit these rows manually.
4. Allow the staging scheduler to invoke `deliver-communications`, or invoke the worker once from a secure operator environment using `POST` and `x-topline-worker-secret`. Use the normal worker path; do not call Brevo directly or bypass the outbox.
5. Confirm the outbox row advances from queued/processing to provider accepted/sent and stores the Brevo provider message ID. Retain the ID in the private evidence record.
6. Confirm the actual message arrives in the controlled mailbox. Check inbox, spam, quarantine and mail-provider trace if available. Record the received timestamp and subject; do not include the full message body or personal mailbox details in public artifacts.
7. Wait for Brevo's delivery webhook. Confirm the callback is authenticated and that the matching outbox row changes to `delivery_status = delivered` (or the equivalent canonical delivered state). Match by the exact provider message ID, not by recipient alone.
8. Open the order in the staff Admin Orders view and refresh **Customer confirmation & delivery**. Confirm the same provider ID and delivered state appear for the exact order.

## 4. Required negative and replay tests

Perform these only in isolated staging with test records:

| Test | Method | Required result |
|---|---|---|
| Missing sender/API key | Readiness check with a deliberately incomplete staging configuration | `ready: false`; no secret values returned |
| Wrong webhook secret | Send a non-provider test POST with a wrong secret and harmless JSON | HTTP 401; no provider event or outbox mutation |
| Invalid webhook JSON | Authenticated test request with malformed JSON | HTTP 400 |
| Oversized webhook body | Authenticated test request exceeding body limit | HTTP 413 |
| Duplicate provider event | Use provider's webhook retry or a controlled replay of the same event/message ID | No duplicate business notification; provider event/outbox state remains idempotent |
| Bounce/failure | Use Brevo's supported test event or a controlled provider test recipient | Failure/bounce state is recorded; no false `delivered` state |
| Worker ambiguous outcome | Use a controlled fault-injection test, not a live recipient | Message is marked uncertain; automatic duplicate send is avoided |

Do not manufacture a `delivered` callback and count it as real provider delivery. Synthetic callback tests validate the handler only; the closure proof must include a genuine Brevo event and the received email.

## 5. Evidence required for G-06 closure

Store a sanitized evidence bundle in `artifacts/customer-communications-uat/` containing:

- staging project ref (not a service key or database URL);
- deployed Edge Function names and deployment versions/commit;
- readiness response with secret values absent;
- test order UUID/number (use restricted/private evidence storage);
- `order.status` workflow event and outbox row IDs, states and timestamps;
- Brevo provider message ID and provider event type/timestamp;
- actual mailbox receipt timestamp and a redacted screenshot or mail trace;
- Admin Orders communication panel result;
- duplicate-event and negative-test results;
- sanitized worker/webhook logs and any failure/retry/uncertain state observed.

Redact recipient addresses where evidence is shared beyond the authorised UAT team. Never include API keys, SMTP passwords, service-role keys, worker/webhook secrets, bearer tokens, callback URLs containing secrets, or full provider payloads.

## Closure rule

G-06 closes only when a normal staging order creates its transactional outbox message, the worker obtains a real Brevo message ID, the controlled mailbox receives the email, Brevo sends a genuine delivery webhook that reconciles the same outbox record to delivered, and the staff order view shows matching evidence. A successful static verifier, test email, provider acceptance, or synthetic webhook alone is insufficient.
