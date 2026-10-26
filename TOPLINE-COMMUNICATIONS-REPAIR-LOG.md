# TOPLINE Communications Repair Log (2026-10-20)

Each entry: defect, how it was reproduced, root cause, files changed, regression protection, and what remains.
Nothing here was deployed. Apply migrations in timestamp order.

## R-01 (P1): Ambiguous provider timeout caused duplicate emails, SMS and WhatsApp messages

* **Reproduced:** harness `03-delivery-failures.mjs` G-10. The mock accepted the email and then never answered. The worker
  recorded a retryable failure, retried, and the provider ended with **two accepted copies**.
* **Root cause:** `deliver-communications` treated every thrown error as retryable. A timeout or a connection dropped after the
  request was sent says nothing about whether the provider accepted it. The `Idempotency-Key` in the request is placed in the JSON
  `headers` object, which Brevo applies as an *email header*, so it gives no de-duplication.
* **Change:** `supabase/functions/deliver-communications/index.ts`: new `isAmbiguousSendFailure()`. Timeouts, aborts and
  connection errors that occur *after* sending now call the existing `mark_communication_delivery_uncertain_worker` (message
  ends `failed`/`unknown`, attempt audited as `uncertain`, never auto-retried). Errors before the request left (connection
  refused, DNS) still retry. A comment now states that the header does not de-duplicate.
* **Protection:** G-10 (email timeout), G-11 (connection reset), G-12 (connection refused still retries and delivers once),
  G-13 (SMS timeout, no second billable SMS), G-14 (staff re-queue delivers once), G-15 (anonymous re-queue denied).
* **Remaining:** a timed-out message that was *not* delivered is now not sent automatically; staff must review Failed/Unknown
  messages in Admin and re-queue. Brevo tag-based reconciliation would automate this but needs live verification (not done).

## R-02 (P1): Marketing consent mismatch and ignored opt-out

* **Reproduced:** `04` F-05..F-07 and an isolated script. After registering with consent and verifying, (1) no preference row
  existed, so the portal showed marketing OFF while a Brevo subscribe was queued; (2) turning marketing off saved a first-ever
  row with `false`, which the trigger ignored: no unsubscribe was queued and the stale subscribe was still sent.
* **Root cause:** `enqueue_brevo_marketing_sync_on_auth_signup` queued Brevo directly without recording consent in
  `customer_notification_preferences`; `enqueue_brevo_marketing_sync_on_preference_change` returned early for any INSERT with `false`.
* **Change:** `supabase/migrations/20261020090000_marketing_consent_consistency_360.sql`. A verified opt-in records the preference
  (source `customer_registration_form`); a first-ever `false` queues an unsubscribe when the address was subscribed or queued and
  supersedes pending subscribes; the registration source is preserved. Repairs existing data: creates the missing preference rows,
  and queues unsubscribes for customers who opted out after subscribing (`consent_repair_2026_10_20`).
* **Protection:** F-01..F-09; `supabase/tests/public_surface_regression.sql` block 11; mutation check (reverting both triggers
  fails the suite).
* **Remaining:** review the repair queue after deploying (it will send unsubscribe calls to Brevo for affected customers).

## R-03 (P1): Guest-to-registered continuity

* **Reproduced:** F-10 (HTTP 400 on the portal) and a probe (0 portal quotations).
* **Root cause:** `create_secure_customer_order` created a new customer for every guest order; `link_customer_portal_user` only
  linked when exactly one customer shared the email; `get_customer_portal_data` listed quotations and orders by customer id only,
  while quotations from the public form have none (the row-level policy already allowed email-based reads); signed-in quotations
  were stored without the customer id.
* **Change:** `supabase/migrations/20261020110000_guest_to_registered_continuity_360.sql`: reuse the record on matching email *and*
  phone (last 9 digits, case-insensitive email); link same-person duplicates (ambiguous different-phone sharing stays unlinked);
  portal shows orders and unattached quotations matching the verified email; signed-in quotations get `customer_id`.
* **Protection:** F-10..F-14, SQL block 11, mutation checks for the link, order and portal functions.
* **Remaining:** existing duplicate customer rows were deliberately **not** merged or deleted. A supervised merge is recommended.
  Customers' history on older duplicate rows stays split across those rows (orders now appear via email in the portal list;
  other portal tabs key on the linked row).

## R-04 (P2): Customers notified of internal states; duplicate for signed-in quotations

* **Reproduced:** `invoice is draft` emailed on draft creation; `Your Topline quotation is new` after every signed-in quotation
  (after R-03) on top of the acknowledgement; internal pipeline words (`lost`, `won`) would be sent as customer messages.
  The duplicate was introduced by R-03 during this audit and caught by a probe before release.
* **Change:** `supabase/migrations/20261020130000_customer_notification_status_guard_360.sql`: allow-lists of customer-meaningful
  statuses. Quotations: quoted, sent, accepted, rejected. Invoices: sent, paid, partial, overdue, cancelled.
* **Protection:** N-01..N-06, SQL block 12, mutation check.
* **Remaining:** **messaging policy decision for the owner.** Add statuses to the lists if customers should hear about them.

## R-05 (P2): No verification resend; raw authentication errors

* **Files:** `src/lib/customer-portal.ts` (`resendCustomerVerification`, `friendlyAuthError`, `isUnverifiedEmailError`),
  `src/pages/portal.tsx` (resend button with 60 s cooldown on the success screen and on the unverified sign-in error; sign-in
  password `minLength` removed so existing short passwords can sign in; autocomplete hints).
* **Design note:** the UI does not announce "already registered" because Supabase deliberately hides that; it gives neutral guidance.
* **Protection:** `tests/smoke/customer-auth-flows.test.tsx` (6 tests).

## R-06: Verification assets

* `tests/e2e-communications/` (reproducible harness, 114 checks), `supabase/tests/public_surface_regression.sql` (blocks 11 and 12),
  `scripts/verify-public-surface-and-email-abuse-360.mjs` (part 5), `supabase/MIGRATION_MANIFEST.md` (126 migrations).

## Earlier rounds (same foundation, for reference)
Public-view write exposure, direct-insert bypass, quotation throttling, email abuse controls, suppression list, consent ordering,
catalogue visibility, inbound size limits, CSV safety, indexes. See `docs/AUDIT-2026-10-16-PUBLIC-SURFACE-AND-COMMUNICATIONS.md`.

## Test mistakes made and corrected during this audit (for transparency)
Some failures were errors in my tests, not product defects, and were corrected rather than hidden: an expectation about how
delivery attempts are logged (one row per attempt that changes outcome), the order response field name (`total`), a guessed SMS
audit table, an invalid order status value, and a false alarm that `notification_events` leaked (customers may read only
their own customer-facing rows; verified). One figure in the matrix ("90/90") was unsupported and was removed.

## Known limitations
GoTrue and Brevo were not run; no mailbox; no production access; no git history. The mocks encode this repository's assumptions
about provider behaviour.

---

# Phase 2 (2026-10-22): buyer onboarding and communications

## R-07 (P2): Contact messages labelled as quotation requests
* **Reproduced:** mutation run of the previous intake function: a Contact-page message produced "We received your Topline quotation request (RFQ-...)".
* **Root cause:** `queue_quotation_intake_emails` ignored the `General Contact Message` marker the Contact page already stores.
* **Change:** `supabase/migrations/20261022090000_buyer_onboarding_and_enquiry_emails_360.sql` (contact wording, `MSG-` reference).
* **Protection:** `10-buyer...` B-01, B-02, B-05; SQL regression block 13.

## R-08 (P2): Owner Reply went to the shared inbox; one owner address only
* **Change:** `communication_outbox.reply_to` column, worker support (`deliver-communications`), staff alerts reply to the buyer; `private.parse_notification_recipients` accepts up to five owner addresses; the volume guard now exempts every `:admin...` copy.
* **Protection:** B-03, B-04, B-10, B-22.

## R-09 (P3): Plain, unbranded emails
* **Change:** `supabase/functions/_shared/email-template.ts` (branded responsive HTML, plain-text footer, own-domain links only), used by the worker.
* **Protection:** `tests/smoke/email-template.test.tsx` (6), B-11..B-13.

## R-10 (P2): No welcome email; thin acknowledgement
* **Change:** `queue_customer_welcome_email` trigger on `customer_portal_access` (one per customer; only for a verification in the last day; skipped for bounced/complaining addresses); richer acknowledgement that never echoes free text.
* **Protection:** B-07, B-08, B-15..B-21; SQL regression block 13.

## R-11 (P1/P2): No customer password reset; expired links unexplained and easily consumed by scanners
* **Change:** `src/pages/portal.tsx`, `src/lib/customer-portal.ts`, `src/lib/supabase.ts`: forgot-password flow, new-password screen, link-problem banner, scanner-proof `token_hash` confirmation; `docs/email-templates/` (four branded Auth templates).
* **Protection:** `tests/smoke/customer-password-recovery.test.tsx` (8).
* **Remaining:** the templates must be installed in the Supabase dashboard; reset and confirmation emails themselves were not generated here.

## R-12: Success-screen copy
* Quotation and contact success messages state a confirmation email is on its way and (quotation) invite account creation.

## Test mistakes corrected in phase 2 (transparency)
Three first-run failures in `10-buyer...` were errors in my test, not product defects: reading a multi-line email body through a
newline-splitting helper (B-09, B-16, B-17), choosing the first of two notification events for one quotation (B-05), and
building an "old verified account" in a way that never created the portal link (B-20). A first attempt to rerun also failed only
because earlier test services still held the database open. A matrix cell (COM-05) briefly implied the magic-link type was tested;
it was corrected to say it shares a code path with the tested types.
