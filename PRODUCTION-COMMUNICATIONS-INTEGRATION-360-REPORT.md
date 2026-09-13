# Production Communications Integration 360

## Scope

This initiative hardens the Topline outbound/inbound communications plane across Brevo email, Africa's Talking SMS, and Meta WhatsApp Cloud API without moving provider credentials into the browser.

## Implemented

- Durable `communication_delivery_attempts` audit trail.
- Service-role-only attempt recording RPC.
- Provider-accepted-but-local-completion failure is marked `unknown`/failed rather than blindly retried, reducing duplicate-send risk.
- Brevo `Idempotency-Key` derived from the durable outbox ID.
- Correct Brevo `message-id` correlation handling.
- Brevo `request`/`accepted` provider states normalized into the delivery state model.
- Constant-time comparison for shared webhook/callback secrets.
- WhatsApp Cloud API `X-Hub-Signature-256` HMAC verification retained and centralized.
- Webhook payload size limits.
- Africa's Talking delivery-report and inbound callback authentication hardened.
- Brevo inbound authentication hardened.
- WhatsApp outbound carries the durable outbox ID as callback metadata.
- Supabase local config aligned to the client-owned PostgreSQL 17 production project.
- Static verification added for the complete communications integration boundary.

## Important deployment boundary

No provider credentials are committed. Configure provider secrets only in the client-owned Supabase project.

Required runtime secrets include the existing Topline provider credentials and callback secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `BREVO_REPLY_TO_EMAIL`
- `AT_USERNAME`
- `AT_API_KEY`
- `AT_SENDER_ID`
- `AT_DLR_SECRET`
- `AT_INBOUND_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `COMMUNICATION_WEBHOOK_SECRET`
- `EMAIL_INBOUND_SECRET`
- `TOPLINE_WORKER_SECRET`

## Provider notes

Brevo supports bearer/custom-header authentication for webhooks and exposes transactional delivery events including sent/request, delivered, bounce, blocked and error states. Topline keeps a private shared-header boundary for the webhook endpoint. Africa's Talking callback endpoints remain protected by the Topline callback secret. WhatsApp webhook requests are validated using Meta's HMAC signature over the raw request body.

## Verification

Run:

```cmd
npm run verify:production-communications-integration-360
npm run typecheck
npm run build
```

Then deploy the migration and Edge Functions through the client-owned Supabase project after the project owner has resolved the CLI/database connection privileges.
