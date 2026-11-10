# Leads / CRM — Staging Live UAT Runbook

**Purpose:** Prove the real enquiry → lead → quotation → customer response → order/project conversion journey, including concurrency and permission boundaries.  
**Target:** Disposable or staging Supabase project and staging web deployment only.  
**Do not run against production.** Use synthetic contacts and retain sanitized IDs/logs only.

## Preconditions

- Deploy the exact candidate build and complete migration chain to an isolated staging project.
- Confirm the migration count and migration hashes match the candidate ZIP before testing.
- Prepare synthetic buyer accounts for two different customers and staff accounts for authorized sales, quotation and read-only roles.
- Confirm email delivery is routed to a test inbox/sink; payment and messaging providers remain sandboxed.
- Record build SHA, migration head, test timestamp, browser/device and role for every run.
- Use a unique test email namespace and phone number range. Never use a real customer's details.
- Keep database/service-role credentials out of browser code, screenshots, test reports and chat.

## Test matrix

| ID | Scenario | Execution | Expected result |
|---|---|---|---|
| CRM-01 | Valid public enquiry | Submit contact form with synthetic name, email, phone, county, service, project type and message | One success response; one lead and one linked quotation; source is `website`; initial lead and quotation states are `new` |
| CRM-02 | Valid quotation-page enquiry | Submit through the dedicated quotation page | Same canonical intake path; fields persist without loss or alias mismatch |
| CRM-03 | Invalid name/email/phone | Submit each invalid value separately | Clear validation failure; no lead or quotation created |
| CRM-04 | Oversized fields | Submit text beyond documented bounds | Rejected safely; no partial records |
| CRM-05 | Recent duplicate retry | Submit identical email and message twice sequentially within two minutes | Second response identifies duplicate and returns original lead/quotation IDs; row counts remain one each |
| CRM-06 | Concurrent duplicate race | Execute the same RPC call simultaneously in two independent DB sessions (procedure below) | Exactly one lead and one quotation; one response is duplicate/replay; no orphan rows. Any two-row result is a blocker |
| CRM-07 | Rate limit | Submit enough distinct enquiries to cross the documented per-email/per-phone hourly limits | Explicit rate-limited result; no extra lead/quotation; no generic 500 |
| CRM-08 | Admin lead list | Sign in as authorized sales staff and open Leads | Records load; search/filter works; canonical fields display correctly; loading/empty/error states are distinct |
| CRM-09 | Lead create/update | Create a synthetic lead; edit name/company/status and save | Canonical columns persist; status values are valid; refreshed list shows changes |
| CRM-10 | Unauthorized lead mutation | Repeat create/update/delete as read-only or unauthorized staff role | Server denies operation; no row changes |
| CRM-11 | Lead notes/ownership/history | Assign/record notes or reminders using supported CRM controls | Owner, notes/reminders and lifecycle events persist and are visible only to permitted roles |
| CRM-12 | Lead conversion | Convert eligible lead with valid email | One canonical customer linked; lead becomes won and references customer; audit event exists |
| CRM-13 | Concurrent lead conversion | Two sessions invoke conversion for the same lead/email at the same time | One customer relationship; both calls resolve consistently; no duplicate customer or conflicting lead links |
| CRM-14 | Repeat lead conversion | Invoke conversion again for already-converted lead | Idempotent response returns existing customer; no second customer/event relationship |
| CRM-15 | Quotation creation/edit/send | Create quotation with valid line items, edit and send through the configured staging flow | Totals and line items persist; status follows actual workflow; recipient is the test inbox |
| CRM-16 | Customer quotation ownership | Open quote as owning customer, then attempt as a different customer | Owner can view/respond; other customer is denied/not found without disclosure |
| CRM-17 | Request changes / decline | Submit each action with and without required note | Missing note rejected; valid note persists; status becomes negotiating/rejected respectively |
| CRM-18 | Expired quotation | Respond to a quote with past `valid_until` | Acceptance rejected with expiry explanation; no order/project created |
| CRM-19 | Accept quotation | Accept an open, valid quote with at least one line item | Quote accepted/converted according to conversion result; exactly one order and project linked; line items and totals match |
| CRM-20 | Concurrent quote acceptance | Two independent customer sessions/actions attempt acceptance on the same quotation | One conversion; both callers receive consistent final state; no duplicate order/project |
| CRM-21 | Staff quotation conversion | Authorized staff converts accepted quotation; unauthorized role repeats | Authorized path succeeds; unauthorized path denied; existing order/project links remain consistent |
| CRM-22 | Repeat quotation conversion | Repeat conversion after successful conversion | Existing order/project returned; no duplicate downstream records |
| CRM-23 | No-line-item quotation | Attempt conversion for accepted quote with no items | Fail closed; no order/project/customer side effects beyond permitted existing customer relationship |
| CRM-24 | Audit and linkage reconciliation | Query lead, quotation, customer, order, project and lifecycle events after successful path | All foreign-key/link fields agree; lifecycle events identify the correct chain |
| CRM-25 | Browser/device regression | Repeat core public and staff journey on desktop and narrow mobile viewport | No blocked controls, uncaught errors, clipped forms or lost submissions |

## Concurrent duplicate enquiry procedure (CRM-06)

1. Use a fresh synthetic email and a unique message, e.g. `UAT-RACE-<run-id>`.
2. Open two independent SQL sessions connected to the same disposable/staging database using an authenticated test context appropriate for the public RPC.
3. Prepare the same RPC call in both sessions. Use identical values for all arguments, especially email and message.
4. Release both calls as close together as possible. Do not serialize them from a single client connection.

Example statement (replace only synthetic test values):

```sql
SELECT public.submit_quotation_request(
  'CRM Race Test',
  'crm-race-unique@example.test',
  '+254700000001',
  'Nairobi',
  'Office fit-out',
  'Flooring installation',
  'UAT-RACE-REPLACE-WITH-UNIQUE-RUN-ID',
  'KES 100,000-200,000',
  'Within 30 days'
);
```

5. After both calls finish, query by the unique email and message. Verify one lead, one quotation, and reciprocal linkage (`leads.converted_quotation_id` ↔ `quotations.lead_id`).
6. Repeat at least 20 rounds with fresh run IDs and randomized start offsets. Save sanitized response booleans and row counts, not contact details.
7. If any round produces two leads/quotes, mark CRM-06 FAIL and block release. Do not clean up by deleting rows manually; preserve staging evidence and repair through a reviewed migration.

## Concurrent conversion procedure (CRM-13 / CRM-20)

- Prepare one eligible lead and one accepted quotation with valid synthetic customer email and at least one quotation line item.
- From two independent authenticated sessions, invoke the relevant conversion/acceptance path simultaneously.
- Verify one canonical customer, one order and one project; verify every relationship points to the same customer and quotation.
- Repeat the call after completion and verify idempotent responses.
- Test conflicting customer identity and unauthorized roles separately; do not weaken RLS or grant broad execution to make tests pass.

## Evidence to capture

- Candidate ZIP SHA-256 and deployed build identifier.
- Staging project reference (redacted), migration head/count and migration replay log.
- Test ID, synthetic run ID, timestamp, role, browser/device and PASS/FAIL.
- Sanitized RPC result flags and generated record IDs (IDs may be retained in restricted staging evidence; never include secrets or personal data).
- Before/after row counts and linkage checks for each concurrency test.
- Browser console/network errors with tokens, cookies, authorization headers and personal data removed.
- Test inbox delivery outcome and provider sandbox event IDs, where applicable.

## Exit criteria

- All CRM-01 through CRM-25 pass.
- CRM-06 and CRM-13/20 pass repeated concurrency rounds without duplicate records.
- No orphan lead/quotation/order/project relationships or duplicate customer identities.
- Permission-denied tests prove server-side denial and no mutation.
- Full migration replay, application build, browser E2E and regression suite pass.
- Any failed test has a tracked remediation and is rerun from a clean staging baseline.

**Release decision:** Until these conditions are evidenced, mark Leads/CRM live certification **OPEN**. Static source verifiers are not a substitute for this runbook.
