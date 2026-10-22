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
