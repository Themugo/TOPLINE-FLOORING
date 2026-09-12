# Communications Provider + Response 360

This initiative completes the production communications boundary for Topline across email, SMS and WhatsApp.

## Provider model

- **Email:** Brevo transactional email.
- **SMS:** Africa's Talking outbound + delivery report/inbound callbacks.
- **WhatsApp:** Meta WhatsApp Cloud API for outbound messages and webhook delivery/inbound responses.
- Browser code never receives provider credentials.
- All outbound messages enter `communication_outbox` first.
- `queued` means durable and awaiting the worker; it is never treated as delivered.

## End-to-end outbound flow

`business event -> notification rule -> customer preference -> communication_outbox -> deliver-communications -> provider -> provider reference -> delivery state -> customer communications timeline`

Automatic event routing covers quotation, order, project, invoice, payment and site-visit events through the existing notification trigger architecture. WhatsApp now participates in the same preference/rule model.

## Responses

Inbound endpoints:

- `email-inbound`: Brevo inbound parsing webhook.
- `sms-inbound`: Africa's Talking inbound SMS callback.
- `communication-provider-webhook`: Brevo delivery events and Conversations webhook fragments.
- `whatsapp-webhook`: Meta verification endpoint plus outbound status and inbound message webhook handling.

Inbound responses are matched to customers by normalized email or Kenyan phone number where possible, persisted in `communication_inbound`, copied into `customer_communications`, and surfaced as staff notifications.

## Required production secrets

Set these only in Supabase Edge Function secrets / deployment secret storage:

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `BREVO_REPLY_TO_EMAIL`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_TEMPLATE_NAME` (recommended for notifications outside the active WhatsApp conversation window)
- `WHATSAPP_TEMPLATE_LANGUAGE`
- `AT_USERNAME`
- `AT_API_KEY`
- `AT_SENDER_ID`
- `TOPLINE_WORKER_SECRET`
- `AT_DLR_SECRET`
- `AT_INBOUND_SECRET`
- `COMMUNICATION_WEBHOOK_SECRET`
- `EMAIL_INBOUND_SECRET`

The existing `SUPABASE_SERVICE_ROLE_KEY` backend secret is used by the current worker architecture. Never expose it through `VITE_*` variables or browser code.

## Provider configuration

### Brevo email

Verify the Topline sending domain/sender and configure a transactional webhook for delivery events to:

`https://jypkhvknfgoqrhwzbdwi.supabase.co/functions/v1/communication-provider-webhook`

Use the `x-topline-webhook-secret` header.

Brevo's transactional email API returns a `messageId`, which is stored as the provider reference/message ID for later delivery events.

### Meta WhatsApp Cloud API

Create/connect the Topline WhatsApp Business Account and phone number in Meta Business Manager. Store the permanent/system-user access token and phone number ID as Supabase Edge Function secrets. The worker sends plain text messages when configured for an active customer conversation and can send a single-body-variable approved template for notification flows outside the conversation window.

Configure the Meta webhook callback to:

`https://jypkhvknfgoqrhwzbdwi.supabase.co/functions/v1/whatsapp-webhook`

Use `WHATSAPP_VERIFY_TOKEN` for the webhook verification challenge. The same endpoint records Meta outbound status events and inbound customer messages into the Topline database.

### Africa's Talking SMS

Configure the Africa's Talking delivery report callback to:

`https://jypkhvknfgoqrhwzbdwi.supabase.co/functions/v1/sms-delivery-report`

Use `x-topline-callback-secret` and the configured `AT_DLR_SECRET`.

Configure inbound SMS to:

`https://jypkhvknfgoqrhwzbdwi.supabase.co/functions/v1/sms-inbound`

Use `x-topline-callback-secret` with `AT_INBOUND_SECRET`.

### Brevo inbound email

For true email replies, configure Brevo inbound parsing on a dedicated receiving subdomain such as `reply.toplineflooringandwaterproofing.co.ke`. Do not use the same domain/subdomain used for outbound sending. Point the inbound webhook to:

`https://jypkhvknfgoqrhwzbdwi.supabase.co/functions/v1/email-inbound`

Use `x-topline-webhook-secret` with `EMAIL_INBOUND_SECRET`.

### Brevo Conversations / email conversations

Configure the Conversations webhook for `conversationStarted` / `conversationFragment` if the Brevo Conversations inbox is used for email/chat conversations. Point it to `communication-provider-webhook`; the endpoint records visitor messages without creating outbound loops.

## Security

Provider endpoints have Supabase gateway JWT verification disabled because external providers cannot supply a Topline Supabase user JWT. They implement their own secret-header authentication before accessing the service-role client.

Worker-only database RPCs require `auth.role() = service_role` and are not executable by `anon` or `authenticated`.

## Verification

Run:

```bash
npm run verify:phase-18-20-communications-provider-response
npm run verify:migration-integrity
npm run verify:phase-14-ci-release-gate
npm run verify:phase-3-email
npm run verify:phase-4-sms
```

Then run the normal lint/typecheck/build and deploy the functions. Live provider delivery requires real provider credentials and provider-side webhook configuration.
