# Topline — Brevo Email Integration 360

## Architecture

Brevo is the canonical transactional email provider for Topline.

- **Application transactional mail:** `deliver-communications` → Brevo `v3/smtp/email` API.
- **Supabase Auth mail:** Supabase Auth custom SMTP → `smtp-relay.brevo.com`.
- **Admin provider test:** `brevo-test-email` Edge Function.
- **Provider delivery events:** `communication-provider-webhook` → durable delivery-event RPC.
- **Inbound email:** `email-inbound` → durable inbound communication RPC.
- **Secrets:** deployment/Supabase secret store only; never in Vite variables, SQL rows, or browser code.

## Brevo account setup

1. Create/verify the Brevo account.
2. Authenticate `toplineflooringandwaterproofing.co.ke` in Brevo (SPF/DKIM as Brevo instructs).
3. Create/verify the sender `no-reply@toplineflooringandwaterproofing.co.ke`.
4. Create/verify the reply-to address `support@toplineflooringandwaterproofing.co.ke`.
5. Create a Brevo API key with the minimum transactional-email scope available in the Brevo account.
6. Store the key as `BREVO_API_KEY` in the Supabase Edge Function secrets/deployment secret store.
7. Set:
   - `BREVO_SENDER_EMAIL=no-reply@toplineflooringandwaterproofing.co.ke`
   - `BREVO_SENDER_NAME=Topline Flooring & Waterproofing`
   - `BREVO_REPLY_TO_EMAIL=support@toplineflooringandwaterproofing.co.ke`

## Supabase Auth SMTP

Configure Supabase Auth's **Custom SMTP** with Brevo's SMTP relay. Recommended:

- Host: `smtp-relay.brevo.com`
- Port: `587`
- Security: STARTTLS/TLS
- Username: the Brevo SMTP login shown by Brevo
- Password: the Brevo SMTP key/password shown by Brevo
- Sender email: `no-reply@toplineflooringandwaterproofing.co.ke`
- Sender name: `Topline Flooring & Waterproofing`

Keep Auth/system mail separate from marketing mail. Do not put SMTP credentials in `.env`, Vite variables, SQL tables, or source control.

## Application delivery

The durable `communication_outbox` remains the source of truth. The worker claims queued rows, sends through Brevo, records provider message IDs, and records failed/retry/uncertain states. This avoids browser-side provider calls and preserves auditability.

## Provider callbacks

Configure Brevo transactional webhooks to the deployed `communication-provider-webhook` endpoint. Protect the endpoint with the deployment's webhook secret header and keep the endpoint outside the public browser application.

For inbound email, configure Brevo's inbound parsing/webhook mechanism to the deployed `email-inbound` function and keep its secret in Edge Function configuration.

## Activation sequence

1. Verify the domain and sender in Brevo.
2. Set the secrets above.
3. Deploy the Edge Functions.
4. Send a provider test from the Admin Site Control Center / Brevo test function.
5. Verify the Brevo message ID and receipt.
6. Configure Supabase Auth Custom SMTP and send a password-reset/magic-link test.
7. Configure provider delivery webhooks and verify delivered/bounced/failed events update `communication_outbox`.
8. Enable the `communications.email` feature flag only after the provider test passes.

## UAT minimum

- Password reset reaches a real mailbox.
- Customer portal magic link reaches a real mailbox.
- One transactional order/quotation notification reaches a real mailbox.
- Brevo returns a provider message ID.
- A delivery event updates the corresponding outbox row.
- A bounce/failure is recorded without leaking provider secrets.
- Duplicate/replayed provider events do not create duplicate business notifications.
