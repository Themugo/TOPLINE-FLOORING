# TOPLINE Registration Acceptance Report (customer journeys)

Date: 2026-10-20. Verdict key: **PASS** = executed and observed. **FAIL** = defect reproduced (now repaired where stated).
**PARTIAL** = some layers executed. **BLOCKED** = required access or infrastructure unavailable. **NOT TESTED** = no test was run.

"Executed" below means the real application code ran against a real database through a real REST layer with provider outcomes
mocked (see `tests/e2e-communications/README.md`). Nothing in this report was observed in production or in a real mailbox.

## Journey 1: Registration

| Step | Result | Evidence |
|---|---|---|
| Form fields and client validation | PASS | existing registration test; `minLength` on the registration password |
| Submission payload (name, phone, company, consent flag, redirect `<origin>/portal`, email lower-cased) | PASS | customer-auth-flows test 'registers with the consent flag...' |
| Registration without consent sends `marketing_email_opt_in=false` | PASS | customer-auth-flows test |
| Supabase Auth user creation and duplicate-account handling | **BLOCKED** | GoTrue not run. The UI deliberately does not reveal whether an email is already registered |
| Pending customer profile created from metadata | PASS | A-01 |
| Unverified user enrolled in marketing | PASS (not enrolled) | A-02 |
| Unverified user has no portal link and cannot load data | PASS | A-03, A-04 |
| Registration metadata cannot grant staff/admin | PASS | H-11 |
| Rate limiting / abuse protection on sign-up | BLOCKED | Provider-side (Supabase Auth limits) |

## Journey 2: Verification and activation

| Step | Result | Evidence |
|---|---|---|
| Confirmation email generated and delivered | **BLOCKED** | Provider-side; checklist section 2 |
| Link origin and allowed redirect | PARTIAL | Redirect value tested in the app; allow-list codified in `supabase/config.toml`; dashboard value unverified |
| Expired, malformed or reused link behaviour | NOT TESTED | Handled by Supabase Auth |
| Verification links the user to the customer record | PASS | A-05 |
| Verified user loads their own profile | PASS | A-06 |
| Resend verification does not create accounts | PASS (UI) | customer-auth-flows (uses `auth.resend`, not `signUp`; 60 s cooldown) |
| Resend email delivered | NOT TESTED | Provider-side |
| Guest who ordered before registering sees earlier orders | PASS after repair (FAIL before) | F-10 |
| Quotation made before registering appears in the portal | PASS after repair (FAIL before) | F-11 |
| Ambiguous shared email is not auto-linked | PASS | F-13 |

## Journey 3: Sign-in, sessions and recovery

| Step | Result | Evidence |
|---|---|---|
| Sign-in with unverified email shows a clear message and offers resend | PASS | customer-auth-flows |
| Existing short passwords can still attempt sign-in | PASS after repair | `minLength` removed from the sign-in field |
| Invalid credentials message | PASS | customer-auth-flows (message mapping) |
| Session refresh, expiry, sign-out, protected routes | NOT TESTED | Supabase client behaviour; existing route smoke tests cover rendering only |
| Customer password reset | **NOT IMPLEMENTED** | No such flow exists; email sign-in link is the only recovery |
| Email sign-in link delivery | NOT TESTED | Provider-side |
| Administrator password reset | NOT TESTED | Provider-side |

## Journey 4: Customer portal access and isolation

| Step | Result | Evidence |
|---|---|---|
| Customer sees only their own data | PASS | H-01..H-03 |
| Forged customer/order ids denied | PASS | H-05..H-08 |
| Direct writes to another customer's records denied | PASS | H-08 |
| Notification preferences changed through the customer's own RPC | PASS | F-05 |

## Journey 5: Quotation and contact forms

| Step | Result | Evidence |
|---|---|---|
| Valid submission persists with lead | PASS | C-01, C-02 |
| Server validation messages | PASS | C-12 |
| Duplicate submit protection | PASS | C-11 |
| Throttle with a visible message | PASS | C-13 and the form UI tests |
| Customer acknowledgement and staff alert generated | PASS | C-02..C-05 |
| UI never claims success when the server rejects | PASS | existing quotation interaction tests |
| Notification failure never erases the enquiry | PASS by design; not tested as a single scenario | The enquiry and its outbox rows are committed together before the worker runs, so a provider failure cannot remove the enquiry. G-01..G-04 exercise provider failures on outbox rows |
| Retry creates no duplicate record or email | PASS | C-10, C-11 |
| Email actually received in a mailbox | **BLOCKED** | No mailbox |

## Journey 6: Orders, payments and invoices

| Step | Result | Evidence |
|---|---|---|
| Guest order confirmation on email, SMS and WhatsApp | PASS (to provider boundary) | E-01..E-07 |
| Status update notification; no duplicate on re-save | PASS | E-08..E-10 |
| Customer channel preferences honoured | PASS | E-11 |
| Payment-received notice for recorded invoice payments | PASS | P-01, P-02 |
| Customer notices for payment failure/pending/refund | NOT IMPLEMENTED | Product decision |
| Draft/internal states not announced | PASS after repair (FAIL before) | N-01..N-06 |

## Journey 7: Marketing consent

| Step | Result | Evidence |
|---|---|---|
| No consent means no enrolment, even after verification | PASS | F-04 |
| Opt-in enrols only after verification, once | PASS | F-01, F-02, F-03 |
| Portal shows the consent that was given | PASS after repair (FAIL before) | repro 'portal shows false'; SQL block 11 |
| Opt-out unsubscribes; stale subscribe never re-sent | PASS after repair (FAIL before) | F-05..F-07 |
| Complaint/bounce suppresses and blocks re-enrolment | PASS | F-08, F-09, WH-11, WH-12 |

## Journey 8: Failure and recovery behaviour

See appendix IDs G-01..G-15, WH-01..WH-12, SC-01..SC-09. All PASS. The timeout-after-accept case (G-10) FAILED before the repair
(two copies delivered) and PASSES after.

## Appendix: every executed end-to-end check

Source: `results.json` produced by `tests/e2e-communications/run-all.mjs` (114 checks, 0 failures).

| ID | Path | Check | Layer | Result |
|---|---|---|---|---|
| W-01 | G/H | Worker rejects wrong secret (401) | e2e-real-function | PASS |
| W-02 | G/H | Worker rejects missing secret (401) | e2e-real-function | PASS |
| W-03 | G/H | Worker rejects non-POST (405) | e2e-real-function | PASS |
| W-04 | G/H | Worker rejects oversized body (413) | e2e-real-function | PASS |
| C-01 | C | Anonymous quotation submit succeeds via REST | e2e-postgrest | PASS |
| C-02 | C | Customer acknowledgement + staff alert queued (2 rows) | e2e-db | PASS |
| C-03 | C | Durable staff notification event recorded | e2e-db | PASS |
| C-04 | C | Worker processes both emails | e2e-real-function | PASS |
| C-05 | C | Provider received customer ack with real line breaks and RFQ reference | e2e-mocked-provider | PASS |
| C-06 | C | Staff alert HTML-escapes user-supplied markup | e2e-mocked-provider | PASS |
| C-07 | C | Sender, reply-to and API key used | e2e-mocked-provider | PASS |
| C-08 | C | Outbox marked sent with provider + message id | e2e-db | PASS |
| C-09 | C | One audited attempt per message: outcome accepted, HTTP 201, provider ref, request id, completed | e2e-db | PASS |
| C-10 | C | Second worker run sends nothing (no duplicates) | e2e-real-function | PASS |
| C-11 | C/D | Double-submit returns same record (no duplicate business record) | e2e-postgrest | PASS |
| C-12 | C/D | Server rejects invalid name/email/phone with message | e2e-postgrest | PASS |
| C-13 | C/D | Per-email throttle triggers after 3/hour (2 of 5 throttled) | e2e-postgrest | PASS |
| C-14 | C/H | Direct anonymous table insert (RPC bypass) is denied | e2e-postgrest | PASS |
| E-01 | E | Anonymous guest order created via REST (server-priced) | e2e-postgrest | PASS |
| E-02 | E | Order confirmation queued on email, SMS and WhatsApp | e2e-db | PASS |
| E-03 | E | Worker delivers all three channels | e2e-real-function | PASS |
| E-04 | E | Recipients normalised per channel (email, +254 SMS, digits-only WhatsApp) | e2e-mocked-provider | PASS |
| E-05 | E | No unrendered {{placeholders}}; customer name rendered | e2e-mocked-provider | PASS |
| E-06 | E | Each message stored with provider + provider message id | e2e-db | PASS |
| E-07 | E | SMS outbox row carries a delivery status and provider reference after submission | e2e-db | PASS |
| E-08 | E | Order status change queues a new notification on every channel | e2e-db | PASS |
| E-09 | E | Status notification renders {{status}} and has no leftover placeholders | e2e-mocked-provider | PASS |
| E-10 | E | Re-saving the same status does not send a duplicate notification | e2e-db | PASS |
| E-11 | E | Customer SMS opt-out is honoured (email + WhatsApp only) | e2e-db | PASS |
| E-12 | G | Hard-bounced address: queued email cancelled at send time, provider never called | e2e-real-function | PASS |
| E-13 | E | All 9 notification rules render without leftover placeholders | e2e-db | PASS |
| G-01 | G | Provider 400 (bad recipient): fails immediately, no retry, never marked sent | e2e-real-function | PASS |
| G-02 | G | A terminally failed message is never re-sent | e2e-real-function | PASS |
| G-03-401 | G | Provider 401: stays queued with backoff, error recorded, not marked sent | e2e-real-function | PASS |
| G-03-429 | G | Provider 429: stays queued with backoff, error recorded, not marked sent | e2e-real-function | PASS |
| G-03-503 | G | Provider 503: stays queued with backoff, error recorded, not marked sent | e2e-real-function | PASS |
| G-04 | G | Retry exhaustion: terminal failed after max_attempts (3), exactly 3 provider calls, error retained | e2e-real-function | PASS |
| G-05 | G | Brevo accepts without messageId: message recorded sent but cannot be correlated (documented risk) | e2e-real-function | PASS |
| G-06 | G | Worker crash after provider accepted: stale lease reclaimed, message completed WITHOUT re-sending | e2e-real-function | PASS |
| G-07 | G | Message locked 2 minutes ago is not claimed by another worker | e2e-real-function | PASS |
| G-08 | G | Two concurrent workers over 30 messages: each sent exactly once (30 calls, 30 unique) | e2e-real-function | PASS |
| G-09 | G | Provider accepted but local completion failed: marked uncertain (failed/unknown), audited, NOT retried | e2e-real-function | PASS |
| G-10 | G | Provider ACCEPTED the email but the response timed out: must not be re-sent | e2e-real-function | PASS |
| G-11 | G | Connection reset after the request was sent: parked uncertain, not re-sent (1 provider copy) | e2e-real-function | PASS |
| G-12 | G | Connection failed BEFORE sending: stays queued, retried, delivered once | e2e-real-function | PASS |
| G-13 | G | SMS response timeout: parked uncertain, no second (billable) SMS | e2e-real-function | PASS |
| G-14 | G | Staff can deliberately re-queue an uncertain message; it is then delivered | e2e-real-function | PASS |
| G-15 | H | Anonymous caller cannot re-queue messages | e2e-postgrest | PASS |
| A-01 | A | Signup creates one pending customer profile from registration metadata | e2e-db | PASS |
| A-02 | A/F | Unverified signup with marketing opt-in is NOT enrolled in marketing | e2e-db | PASS |
| A-03 | A | Unverified user has no portal access link yet | e2e-db | PASS |
| A-04 | A/H | Unverified account cannot load customer data | e2e-postgrest | PASS |
| A-05 | A | Email verification links the auth user to the customer record | e2e-db | PASS |
| A-06 | A | Verified customer loads their own profile via REST | e2e-postgrest | PASS |
| F-01 | F | Verification of an opted-in account queues exactly one subscribe | e2e-db | PASS |
| F-02 | F | Repeated verification updates do not queue a second subscribe | e2e-db | PASS |
| F-03 | F | Worker subscribes the verified opt-in to the configured Brevo list | e2e-real-function | PASS |
| F-04 | F | Registration WITHOUT consent never enters marketing queue (even after verification) | e2e-db | PASS |
| F-05 | F | Customer opt-out via portal RPC queues an unsubscribe | e2e-postgrest | PASS |
| F-06 | F | Worker unlinks the contact from the marketing list | e2e-real-function | PASS |
| F-07 | F | Failed subscribe then opt-out: the stale subscribe is never re-sent (no resurrected consent) | e2e-real-function | PASS |
| F-08 | F | Spam complaint recorded in suppression list | e2e-postgrest | PASS |
| F-09 | F | Re-opt-in after a spam complaint does not re-enrol the address | e2e-real-function | PASS |
| F-10 | A | Guest who later registers (same email) sees their earlier orders in the portal | e2e-postgrest | PASS |
| F-11 | A/C | Quotation requested BEFORE registering appears in the portal after verification | e2e-postgrest | PASS |
| F-12 | A | Returning guest (case/phone-format differences) reuses one customer record | e2e-postgrest | PASS |
| F-13 | A/H | Ambiguous email shared by different phones is not auto-linked (no cross-person exposure) | e2e-postgrest | PASS |
| F-14 | C | Quotation submitted while signed in is attached to the customer record | e2e-postgrest | PASS |
| H-01 | H | Customer A's portal contains A's order and none of B's orders/quotations | e2e-postgrest | PASS |
| H-02 | H | Direct REST read of orders returns only the caller's rows | e2e-postgrest | PASS |
| H-03 | H | Direct REST read of customers cannot see other customers | e2e-postgrest | PASS |
| H-04b | H | Customer sees only their own customer-facing notifications (never staff-audience events) | e2e-postgrest | PASS |
| H-04 | H | Customer cannot read internal tables (outbox, staff, marketing queue, suppressions, payments) | e2e-postgrest | PASS |
| H-05 | H | Forged customer id: A cannot read B's communications via get_customer_communications_360 | e2e-postgrest | PASS |
| H-06 | H | Forged customer id: A cannot change B's notification preferences | e2e-postgrest | PASS |
| H-07 | H | Forged order id: A cannot read the payment status of B's order | e2e-postgrest | PASS |
| H-08 | H | Direct insert into B's preferences is denied | e2e-postgrest | PASS |
| H-09 | H | Staff-only RPCs reject customers and anonymous callers | e2e-postgrest | PASS |
| H-10 | H | Anonymous: no private reads, cannot write products, cannot open the portal | e2e-postgrest | PASS |
| H-11 | H | Registration metadata cannot create staff access or grant admin rights | e2e-postgrest | PASS |
| H-12 | H | Positive control: an active owner can reach the staff RPC and read orders | e2e-postgrest | PASS |
| WH-01 | G/H | Webhook rejects a wrong secret (401) | e2e-real-function | PASS |
| WH-02 | G/H | Webhook rejects a missing secret (401) | e2e-real-function | PASS |
| WH-03 | G/H | Webhook rejects GET (405) | e2e-real-function | PASS |
| WH-04 | G | Webhook returns 400 for malformed JSON | e2e-real-function | PASS |
| WH-05 | G | Webhook rejects a >1 MB payload (413) | e2e-real-function | PASS |
| WH-06 | G | Worker stored the provider message id returned by Brevo | e2e-real-function | PASS |
| WH-07 | G | A delivered event correlates to the sent message and marks it delivered | e2e-real-function | PASS |
| WH-08 | G | Replaying the identical event is idempotent (no extra event row, status unchanged) | e2e-real-function | PASS |
| WH-09 | G | A late/out-of-order "request" event cannot regress delivered to an earlier state | e2e-real-function | PASS |
| WH-10 | G | Event for an unknown message id is accepted without error or state change | e2e-real-function | PASS |
| WH-11 | G | Hard bounce: message flagged failed and the address is suppressed | e2e-real-function | PASS |
| WH-12 | F | Brevo "unsubscribed" event is recorded in the suppression list | e2e-real-function | PASS |
| IN-01 | H | Inbound email rejects a wrong secret (401) | e2e-real-function | PASS |
| IN-02 | G | Inbound customer email is recorded for staff | e2e-real-function | PASS |
| IN-03 | G | A 3 MB inbound email is accepted but stored bounded (<= 20,000 chars) | e2e-real-function | PASS |
| IN-04 | G | Inbound email without a body is rejected (400) | e2e-real-function | PASS |
| SC-01 | G/H | Scheduler rejects a wrong secret (401) | e2e-real-function | PASS |
| SC-02 | G | Scheduler accepts the secret as a Bearer token too | e2e-real-function | PASS |
| SC-03 | G | Scheduler rejects an unsupported job request (400) | e2e-real-function | PASS |
| SC-04 | G | One scheduler call runs all four jobs and all succeed | e2e-real-function | PASS |
| SC-05 | G | Scheduler -> worker chain delivered the queued email | e2e-real-function | PASS |
| SC-06 | G | Every job run is recorded with its outcome | e2e-db | PASS |
| SC-07 | G | Overlapping scheduler run is skipped while the first holds the lock (no double processing) | e2e-real-function | PASS |
| SC-08 | G | The first run completes and releases the lock | e2e-real-function | PASS |
| SC-09 | G | Crashed scheduler: expired lock is recovered, dead run marked timed_out, queued mail still delivered | e2e-real-function | PASS |
| P-01 | E | Recording an invoice payment queues a payment-received notice on each enabled channel | e2e-db | PASS |
| P-02 | E | Payment-received email is delivered with a rendered message (no placeholders) | e2e-real-function | PASS |
| N-01 | C | Signed-in quotation sends exactly the acknowledgement + staff alert (no extra "quotation is new") | e2e-db | PASS |
| N-02 | C | Internal pipeline states (contacted, negotiating, lost, won, converted) send nothing to the customer | e2e-db | PASS |
| N-03 | C | Customer-meaningful quotation states (quoted, accepted, rejected) still notify (>=1 channel) | e2e-db | PASS |
| N-04 | E | Creating a DRAFT invoice sends nothing to the customer | e2e-db | PASS |
| N-05 | E | Marking the invoice SENT notifies the customer; delivered email is clean | e2e-real-function | PASS |
| N-06 | E | Marking the invoice PAID notifies the customer | e2e-db | PASS |
