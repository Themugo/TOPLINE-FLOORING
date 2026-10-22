# TOPLINE Production Email and Registration Checklist

Project ref `zmbsskvnzjdaxuxlauyx`; site `https://toplineflooringandwaterproofing.co.ke`.
Everything below needs access this audit did not have. Tick each item and keep evidence (screenshots with secrets hidden,
provider message ids, redacted headers). **Never paste a key, password or token into chat, tickets or this file.**

## 0. Deploy order (do not skip)

1. Back up: take a Supabase database backup or confirm point-in-time recovery is on.
2. Compare history: `supabase migration list` against `supabase/MIGRATION_MANIFEST.md` (126 files). Investigate any drift first.
3. Run in the SQL editor and keep the result: `select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='public_projects' and grantee in ('anon','authenticated');` Expect only `SELECT`. If anything else appears, apply the REVOKE from `docs/AUDIT-2026-10-16-PUBLIC-SURFACE-AND-COMMUNICATIONS.md` before anything else.
4. `supabase db push` (applies new migrations in order). The last three of this audit are `20261020090000`, `20261020110000`, `20261020130000`.
5. **Before the worker next runs**, inspect the consent repair: `select email, action, status from brevo_marketing_sync_queue where consent_source = 'consent_repair_2026_10_20';` These are unsubscribe requests for customers who had opted out. Confirm they are expected.
6. Deploy Edge Functions: `deliver-communications`, `communication-provider-webhook`, `operations-scheduler`, `expire-reservations`, `payment-initiate`, `payment-callback`, `email-inbound` (and `sms-inbound`, `whatsapp-webhook`, `sms-delivery-report` if used).
7. Deploy the web app (Vercel).

## 1. Scheduler (CRITICAL: without it no email is ever sent)

The repository contains no timer. `operations-scheduler` must be called on a schedule.

- [ ] Create a recurring call (Supabase Cron or an external scheduler) to the `operations-scheduler` function URL, method POST, with header `x-topline-worker-secret` (or `Authorization: Bearer`) carrying the value of `TOPLINE_WORKER_SECRET`.
- [ ] Cadence about every **1 minute**. Each call delivers up to 20 messages; the lock prevents overlap; an expired lock recovers on the next run.
- [ ] Check `automation_job_runs`: recent rows with `status = 'succeeded'` for `deliver_communications`, `expire_inventory_reservations`, `reconcile_payment_provider_events` and `reconcile_communications`, and no stuck `running` rows older than 5 minutes.

## 2. Supabase Auth (dashboard: Authentication)

- [ ] **Sign-in / Providers, Email:** "Confirm email" **ON**. The marketing opt-in only proves ownership of an address when this is on.
- [ ] Minimum password length 8 or more; enable leaked-password protection if your plan allows it.
- [ ] Secure email change / double-confirm ON (matches `supabase/config.toml`).
- [ ] **URL Configuration:** Site URL `https://toplineflooringandwaterproofing.co.ke`; Redirect URLs include `https://toplineflooringandwaterproofing.co.ke/portal` and `https://toplineflooringandwaterproofing.co.ke/admin/settings` (add staging origins deliberately; the codified list in `config.toml` replaces the dashboard list if you ever run `supabase config push`).
- [ ] **SMTP Settings:** custom SMTP enabled (Supabase's built-in sender is heavily rate-limited and not for production). Use the Brevo SMTP relay with a dedicated SMTP key and a sender on your authenticated domain.
- [ ] **Email Templates:** Confirm signup, Magic link, Reset password and Change email all use `{{ .ConfirmationURL }}` and show the TOPLINE name; subject lines make sense.
- [ ] **Rate limits:** note the current per-hour email limit; it must exceed your expected registrations.

## 3. Brevo

- [ ] Sender domain authenticated: **SPF, DKIM and DMARC** published and showing valid in Brevo (and a DMARC policy at least `p=none` with reporting while you monitor).
- [ ] The sender address in `BREVO_SENDER_EMAIL` is a verified sender on that domain.
- [ ] A transactional API key created for this site only; IP restrictions reviewed.
- [ ] The marketing list exists and `BREVO_MARKETING_LIST_ID` is its numeric id.
- [ ] **Webhook:** transactional events (request, delivered, soft/hard bounce, spam, blocked, invalid, unsubscribed, opened optional) POSTing to the `communication-provider-webhook` function URL with the custom header `x-topline-webhook-secret` set to the value of `COMMUNICATION_WEBHOOK_SECRET`. Confirm Brevo can send a custom header on its webhook (if not, front the function with a verified relay).
- [ ] **Inbound parsing** (if used) pointing to the `email-inbound` function URL with the custom header `x-topline-webhook-secret` set to the value of `EMAIL_INBOUND_SECRET` (a different secret from the delivery webhook, but the same header name).
- [ ] Confirm the Brevo daily/hourly sending quota is above expected volume.

## 4. Edge Function secrets (names only; set with `supabase secrets set`)

`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_REPLY_TO_EMAIL`, `BREVO_MARKETING_LIST_ID`,
`TOPLINE_WORKER_SECRET`, `COMMUNICATION_WEBHOOK_SECRET`, `EMAIL_INBOUND_SECRET`, `TOPLINE_WEB_ORIGIN` (extra allowed browser origins, comma separated),
`AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` (SMS), `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (WhatsApp), payment provider secrets (M-Pesa and card).
- [ ] Each secret exists; none appears in source, logs or screenshots.
- [ ] Staff alert address: in Admin Site Control, `communications.email` has `quotation_admin_email` set to a monitored mailbox.
- [ ] Set a provider-side daily spending cap for SMS and WhatsApp (the database also limits automated sends).

## 5. Controlled inbox acceptance tests

Use a mailbox you own and a dedicated test identity. Do not use a real customer. Record the provider message id for each.

| # | Test | Pass when |
|---|---|---|
| 1 | Register a new test account **with** marketing consent | A confirmation email arrives within a few minutes from the right sender; link opens `/portal` on the production domain; no browser warnings |
| 2 | Before verifying, try to sign in | Message says the email is not verified; "Resend verification email" sends a second email; the first link is not required |
| 3 | Open the verification link in a different browser | Account verifies; portal loads with the customer's own details; marketing shows ON |
| 4 | Reuse the same link | Safe, understandable result (no error page leaking details) |
| 5 | Sign out, use "Email me a sign-in link" | Link arrives and signs in |
| 6 | Administrator "forgot password" | Reset email arrives; link lands on `/admin/settings`; new password works |
| 7 | Submit a quotation and a contact message on the live site | Customer acknowledgement arrives with RFQ reference, correct line breaks, no stray characters; staff alert arrives at the configured mailbox |
| 8 | Place a test order (small amount, test product) | Order confirmation by email (and SMS/WhatsApp if enabled) shows correct name and details |
| 9 | Turn marketing OFF in the portal | Within a few minutes the contact is removed from the Brevo list; no marketing arrives |
| 10 | Send a message to a deliberately invalid address you control the domain of | Provider reports a bounce; the address appears in `communication_suppressions`; later messages to it are cancelled |
| 11 | Check headers of one received email | SPF, DKIM, DMARC all pass; not in spam |
| 12 | Check `communication_outbox` | Each test message is `sent` with `provider_message_id`, later `delivered` once the webhook arrives |

## 6. Ongoing monitoring

- [ ] Alert on `communication_outbox` rows `failed` or with `delivery_status = 'unknown'` (these include ambiguous timeouts that need a human decision: verify at Brevo, then re-queue deliberately from Admin only if the message was not delivered).
- [ ] Alert on `queued` rows older than 15 minutes (the scheduler is not running).
- [ ] Review `communication_suppressions` weekly; do not delete bounces or complaints.
- [ ] Review the staff-alert cap: more than 30 quotation alert emails in an hour means a flood; the enquiries are still saved and notified in Admin.

## 7. Owner decisions recorded by this audit

- [ ] Customer-facing status allow-lists (quotations: quoted, sent, accepted, rejected; invoices: sent, paid, partial, overdue, cancelled): confirm or extend.
- [ ] Customer password reset: add or accept the sign-in link as the only recovery.
- [ ] Customer notices for payment failure, pending and refund: add or accept their absence.
- [ ] Merge existing duplicate customer records under supervision.
