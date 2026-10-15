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


## Quotation intake and consent-gated marketing synchronization

The migration `20261015180000_email_quotation_and_brevo_marketing_sync_360.sql` adds two durable flows:

- Every newly inserted quotation queues a transactional acknowledgement to the requester and a new-RFQ alert to the configured administrator. The admin destination is `site_integration_configs.public_config.quotation_admin_email` for `communications.email`; when unset, it falls back to the email in CMS `contact/info`, then `footer/contact`. Set and verify that destination before live use.
- Customer portal `marketing_email_enabled` changes are recorded in `brevo_marketing_sync_queue`. Only explicit opt-ins are added to the Brevo marketing list. Opt-outs unlink the address from the configured list; they do not globally blacklist the address, so transactional email can still be sent.

Add these secrets/configuration to Supabase Edge Function environment (never Vite/client env):

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `BREVO_REPLY_TO_EMAIL`
- `BREVO_MARKETING_LIST_ID` (numeric list ID from Brevo)
- Existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `TOPLINE_WORKER_SECRET`

The existing `deliver-communications` worker processes both the transactional outbox and marketing sync queue. The existing `operations-scheduler` must be deployed/configured and invoked on a recurring schedule with `x-topline-worker-secret`; otherwise queued messages and marketing list changes remain queued. Inspect worker results for `marketing_sync.configured` and processed counts.

### Activation and real-mailbox UAT

1. Apply migrations in the canonical order, including the new 20261015 migration, to the intended Supabase project.
2. Verify the Brevo sender/domain and configure the marketing list ID.
3. Deploy `deliver-communications` and `operations-scheduler` with required secrets.
4. Configure Supabase Auth Custom SMTP using Brevo's SMTP login/password separately; the API key for transactional API calls is not the SMTP password.
5. Use Admin Site Control to send a Brevo test message to a mailbox you control.
6. Submit a test quotation and verify both the admin RFQ alert and customer acknowledgement arrive, with provider message IDs and delivery webhooks recorded.
7. Register a test account with the marketing checkbox unchecked; verify it does not join the Brevo marketing list. Repeat with the checkbox checked; confirm no subscription is queued before email verification, then verify the address and confirm it joins the configured list.
8. In a linked customer account, turn marketing email on and verify the contact joins the configured list; turn it off and verify the contact is removed from that list. Confirm transactional mail is still possible after opt-out.
9. Test password reset, signup verification, and magic-link email from Supabase Auth.

Do not bulk-import historic customer addresses into the marketing list unless there is documented, valid marketing consent for each address. A quotation request or account registration alone is not marketing consent. This repository change cannot verify Brevo account/domain state or prove live delivery until the above UAT is completed.
