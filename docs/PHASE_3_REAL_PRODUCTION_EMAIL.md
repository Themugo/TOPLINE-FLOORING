# Phase 3 — Real Production Email

## Decision

Topline uses two separate email lanes:

1. **Human/business mail** — keep the existing cPanel mailbox infrastructure during launch. Do not break live business correspondence while the application migrates.
2. **Application/transactional mail** — use Brevo initially because its current free tier supports 300 email sends/day. Supabase Auth uses the same provider through custom SMTP.

Cloudflare Email Routing remains an optional future low-cost inbound forwarding layer, not a replacement for a full mailbox. Zoho Mail Free is an optional mailbox alternative where the free plan is available; it is web-only and limited to one domain/five users.

## DNS model

Use the company's DNS provider as the source of truth. Never publish guessed SPF/DKIM values. Copy the exact records provided by Brevo/other providers.

Recommended sending identities:

- `no-reply@auth.<domain>` — Supabase Auth
- `notifications@notify.<domain>` or `notifications@<domain>` — application notifications
- human addresses remain on the existing mailbox system

Keep Auth/transactional sending separate from future marketing sending.

## Required secrets

Set only in Supabase Edge Function secrets / Supabase Auth SMTP settings:

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AT_USERNAME` (when SMS is activated)
- `AT_API_KEY` (when SMS is activated)
- `AT_SENDER_ID` (when SMS is activated)

Never use `VITE_` variables for these values and never commit them.

## Edge Function

`deliver-communications` claims queued messages using service-role-only database RPCs and delivers email through Brevo or SMS through Africa's Talking. WhatsApp deliberately fails until a real provider is configured.

## Supabase Auth

Configure Authentication > SMTP with Brevo's SMTP host, port, username and password, then set the Auth sender address. Supabase's built-in SMTP is not production-safe and is currently limited to low-volume/testing use.

## Delivery states

`queued -> sent`

or

`queued -> retry -> sent`

or

`queued -> failed`

Provider references are stored for operational reconciliation. A queued record is never treated as sent.

## Launch checklist

- [ ] Create/verify Brevo account.
- [ ] Verify sending domain.
- [ ] Publish provider-provided SPF/DKIM records.
- [ ] Publish DMARC policy.
- [ ] Configure Brevo sender.
- [ ] Configure Supabase Auth custom SMTP.
- [ ] Add Edge Function secrets.
- [ ] Deploy `deliver-communications`.
- [ ] Configure a scheduler/worker invocation at a safe cadence.
- [ ] Send a real Auth email.
- [ ] Queue a real Topline notification.
- [ ] Confirm delivery and provider reference.
- [ ] Test provider failure/retry.
- [ ] Test invalid recipient handling.
- [ ] Keep cPanel human mail unchanged until application email UAT passes.

## Cost posture

Initial application-email cost target: $0/month on provider usage, subject to provider terms and the 300/day Brevo free allowance. Domain registration and existing mailbox/hosting costs are separate.
