# TOPLINE Email, Registration & Business Communications Audit — 2026-10-15

## Scope and baseline

Foundation: `TOPLINE-SHOP-MATERIALS-CART-END-TO-END-FIX-2026-10-15.zip`. This sweep preserves the existing Supabase, CMS, customer portal, communication outbox, Brevo provider, and scheduler architecture. It does not introduce a parallel email provider or send provider secrets to the browser.

## Findings

1. **Quotation intake persisted records but did not queue email.** `submit_quotation_request` inserts the lead and quotation and returns success. The existing notification catalogue describes `quotation.received` as `catalog_only`; it is not a send path for new public quotation intake.
2. **Transactional delivery infrastructure already exists.** `communication_outbox` and `deliver-communications` use Brevo's transactional API, provider message IDs, idempotency, delivery-attempt audit and retries. The operations scheduler already invokes this worker.
3. **Brevo sender/API setup is not the same as Auth SMTP.** Application transactional email uses `BREVO_API_KEY`; Supabase Auth registration/verification/password-reset mail needs Custom SMTP credentials in Supabase Auth settings.
4. **Marketing consent exists in the customer portal but was not synchronized to Brevo.** `marketing_email_enabled` was stored in `customer_notification_preferences`, with default false. No marketing list synchronization was found in the previous delivery path.
5. **Live provider status cannot be certified from source checks.** Brevo API key, sender/domain verification, numeric list ID, Supabase Auth SMTP setup, deployed Edge Functions, scheduler cadence and mailbox receipt all require the real deployment/account.
6. **The initial migration candidate had an invalid queue column declaration (`status` lacked a SQL type).** Corrected in this sweep and added an explicit verifier assertion so this regression is detected.
7. **Customer registration did not expose a marketing opt-in.** Added an optional unchecked-by-default checkbox; only affirmative consent metadata is eligible, and sync waits until the Auth email is verified.
8. **Admin quote notification could be email-less if no recipient is configured.** The quotation trigger now always creates a durable staff notification, marks whether an admin email was queued, validates the configured admin email/CMS fallback before queueing, and uses that address for email. Live activation still requires a verified monitored recipient.

## Changes in this sweep

- Added migration `20261015180000_email_quotation_and_brevo_marketing_sync_360.sql`.
- Newly inserted quotation records queue two idempotent transactional emails through the existing outbox: an acknowledgement to the requester and an alert to the configured admin address. Admin destination resolves from `site_integration_configs.public_config.quotation_admin_email`, then CMS `contact/info`, then CMS `footer/contact`.
- The acknowledgement explicitly does not imply marketing consent.
- Added a durable, RLS-locked marketing sync queue. It is populated only when a customer portal marketing preference is explicitly enabled or changed, or when the customer separately checks the registration marketing opt-in and subsequently verifies the email. No quote-only or ordinary registration address is auto-subscribed.
- Extended `deliver-communications` to process queued Brevo marketing list membership updates using server-only `BREVO_API_KEY` and `BREVO_MARKETING_LIST_ID`. Opt-in links the contact to the configured list; opt-out unlinks that list without globally blacklisting the contact, preserving transactional messages.
- Added stale-lock recovery, bounded retry/backoff, a staff notification fallback, an audit verifier that checks SQL status typing, and operational runbook steps.
- Updated the delivery-worker verifier so its `started_at` assertion is scoped to delivery-attempt queries and does not reject the separate marketing queue's `created_at` ordering.

## Source verification

- Previous package verifier was 13/13; this sweep extends it with checks for typed SQL status, explicit registration consent, verified-email gating, and durable staff notification. Re-run the updated verifier before release.
- `verify:brevo-email`: 14/14 passed.
- `verify:delivery-worker-hardening`: passed after correcting the overly broad assertion.
- `verify:production-communications-integration-360`: passed (118 migrations).
- `verify:communications-comm-10-12`: passed.

A new UI smoke test was added for the optional registration marketing checkbox, but it still needs execution on the Windows checkout. Other source-level verifiers passed. These are not live-delivery checks: the new SQL migration and Edge worker have not been applied/deployed to the live Supabase/Brevo environment in this audit, and no real email has been sent from the live account.

## Required live activation today

1. Confirm intended Supabase project/ref and apply migrations in order, including the new migration.
2. In Brevo, verify sender/domain SPF/DKIM and choose/create the correct marketing list; record its numeric list ID.
3. Set Edge secrets: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_REPLY_TO_EMAIL`, `BREVO_MARKETING_LIST_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TOPLINE_WORKER_SECRET` and the existing webhook secret.
4. Configure `communications.email.public_config.quotation_admin_email` if the desired admin recipient differs from the CMS contact email. Verify the CMS fallback address is the actual monitored business inbox.
5. Deploy `deliver-communications`, `communication-provider-webhook`, `brevo-test-email`, and `operations-scheduler`; confirm scheduler cadence is active and authenticated.
6. In Admin Site Control, send a test to a mailbox controlled by the business. Confirm provider message ID and actual inbox receipt.
7. Configure `quotation_admin_email` in the `communications.email` public config (or verify the CMS contact email is the monitored admin inbox). Submit one test quotation. Verify both admin alert and requester acknowledgement in real mailboxes, and verify outbox state/provider IDs. The admin dashboard also receives a durable staff notification; this does not replace email UAT.
8. In a test customer account, opt in to marketing; invoke the worker and verify the contact appears in the correct Brevo list. Opt out and verify list removal. Confirm transactional email remains possible.
9. Configure Supabase Auth Custom SMTP separately and test signup verification, resend verification, password reset and magic link from real mailboxes.
10. Inspect bounces/unsubscribes and delivery webhooks; do not bulk-import historical addresses unless documented valid marketing consent exists for each address.

## Exit criteria

Do not mark production email as certified until the live tests above pass. Missing configuration should remain visible as a blocker, not be represented as a successful send. Marketing subscription status must be consent-driven; transactional quotation/customer lifecycle email remains separate from promotional marketing.

## Windows verification command

Run `TOPLINE-EMAIL-REGISTRATION-COMMUNICATIONS-VERIFY.cmd` from the extracted project after dependencies are installed. It runs the communication source verifiers, smoke suite (including the registration-consent UI test), TypeScript check and production build. It pauses on both success and failure so the terminal output remains visible.
