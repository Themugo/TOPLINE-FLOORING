# TOPLINE FLOORING & ROOFING: Registration and Communications End-to-End Audit

Audit date: 2026-10-20. Foundation: `TOPLINE-FLOORING-main-AUDITED-2026-10-16-v4` (123 migrations). Result: 126 migrations.
Companion files: `TOPLINE-COMMUNICATIONS-TEST-MATRIX.csv`, `TOPLINE-REGISTRATION-ACCEPTANCE-REPORT.md`,
`TOPLINE-COMMUNICATIONS-REPAIR-LOG.md`, `TOPLINE-PRODUCTION-EMAIL-CHECKLIST.md`, `tests/e2e-communications/`.

## 1. Executive verdict

**PARTIAL.** The application, database and delivery-worker layers were verified by executing real code. The complete
journey "customer registers, receives the confirmation email, signs in, and receives business emails in a real inbox" has
**not** been proven in production, because nothing here could reach the production Supabase project, Supabase Auth's email
service, Brevo, DNS, or a real mailbox.

| Layer | Verdict | Basis |
|---|---|---|
| Database schema, triggers, RPCs, RLS | **PASS** | 126 migrations applied to an empty database; 5 SQL suites pass (including `plpgsql_check`) |
| REST authorization (customer, staff, anonymous, service role) | **PASS** | 13 checks with genuinely signed tokens through real PostgREST |
| Delivery worker, webhook, inbound, scheduler (real source) | **PASS after 1 repair** | 114-check harness, 0 failures; one defect reproduced and fixed (see 5.1) |
| Registration UI and resend flow | **PASS** | 6 interaction tests plus the existing consent test |
| Supabase Auth emails (confirmation, resend, reset, sign-in link) | **NOT TESTED** | GoTrue and its mail service were not available |
| Brevo acceptance, inbox delivery, rendering, DNS authentication | **BLOCKED** | No provider access or mailbox |
| Production configuration and migration history | **BLOCKED** | No read access to the live project |

Counts of tests actually executed and observed:

* End-to-end harness: **114 executed, 114 passed, 0 failed** (run twice from a fresh database; second run after final code edits).
* SQL suites: **5 of 5 pass** (`security_regression`, `public_surface_regression`, `browser_rpc_grants`, `plpgsql_static_analysis`, `runtime_contracts`).
* Application tests (vitest): **207 of 207 pass** (201 existing + 6 new). Typecheck, lint and production build pass.
* Repo verifier suite (`verify:all`): **132 of 132 pass** (static checks; these are not evidence of runtime behaviour).
* Dependency audit (production): 0 vulnerabilities.
* Mutation checks: each repaired function was reverted to its pre-fix version and the regression suite failed every time (5 of 5).

Critical defects reproduced: **4 (all repaired)**, plus 1 UX gap repaired. Details in the repair log.

## 2. Baseline and limits of this audit

* The uploaded archive contains no `.git` directory, so the branch, commit and working-tree state could not be established.
  Earlier unrelated work was preserved by editing only what each defect required.
* Migration reconciliation against the deployed history was **not possible** (no access). Apply the new migrations in
  timestamp order and compare with `supabase migration list` before relying on them.
* The test database was built from the repo's migrations on PostgreSQL 16 with a local Supabase shim. Hosted Supabase differs in
  places (extensions, default privileges); the harness mimics the PostgREST claim handling.
* Real provider behaviour is represented by mocks written from the worker's own request and response handling. They prove
  the application reacts correctly to each outcome; they do not prove Brevo behaves as mocked.

## 3. Architecture traced

```
Browser (React/Vite on Vercel)
   | supabase-js (anon key / customer JWT)
   v
PostgREST ---> PostgreSQL (RLS, SECURITY DEFINER RPCs, triggers)
   ^                 |  triggers write communication_outbox, notification_events, brevo_marketing_sync_queue
   |                 v
Supabase Auth (GoTrue) --email--> customer        operations-scheduler (EXTERNAL timer required)
   | INSERT/UPDATE auth.users                          |  job lock, 20 messages per call
   | -> prepare_customer_registration (pending        v
   |    customer) -> link_customer_portal_user   deliver-communications ---> Brevo email / contacts
   |    (on email verification)                        |                 ---> Africa's Talking SMS
   |                                                   |                 ---> WhatsApp Graph API
   |                                          communication-provider-webhook <--- Brevo events
   |                                          email-inbound / sms-inbound / whatsapp-webhook
```

Registration pathways that exist: email/password sign-up (`registerCustomerAccount`), email sign-in link
(`requestCustomerMagicLink`), email/password sign-in, administrator password reset (`/admin/login`). A customer
password-reset flow does **not** exist (the sign-in link is the only recovery route).

## 4. Findings by area

### 4.1 Registration and verification
* Sign-up sends the consent flag, name and phone as metadata; the confirmation redirect is `<origin>/portal`; both verified by test.
* A pending customer record is created at sign-up; marketing enrolment and portal linking wait for verification (verified A-01..A-05).
* An unverified account cannot load customer data (A-04).
* Registration metadata cannot create staff access (H-11: attempted `role`, `is_admin`, `permissions` keys).
* **Gaps repaired:** no way to resend the verification email; raw authentication errors shown to customers.
* **Not verifiable here:** that the Auth email is generated, its link, expired/reused-link behaviour, and the actual Supabase "Confirm email" setting.

### 4.2 Database authorization
* Customer A could not read B's orders, quotations, customer record, preferences or payment status through any tested route (H-01..H-08).
* Staff-only RPCs reject customers and anonymous callers; an active owner can use them (H-09, H-12).
* Anonymous callers cannot read private tables, write products or open the portal (H-10).
* `notification_events` is intentionally readable by a customer for their own customer-facing rows only (H-04b).

### 4.3 Communications delivery
* Retry/backoff, exhaustion, crash recovery, lease handling and concurrency behave correctly (G-01..G-09).
* Webhook and scheduler authentication, replay and out-of-order protection, and lock recovery behave correctly (WH, SC).
* **Defect (repaired):** ambiguous timeouts caused duplicate sends (5.1).

### 4.4 Consent and continuity
* **Defects (repaired):** marketing consent mismatch and ignored opt-out (5.2); guest-to-registered continuity failures (5.3).

### 4.5 Message content quality
* **Defect (repaired):** customers were notified of internal states ("invoice is draft", "quotation is lost") (5.4).

## 5. Defects reproduced and repaired

| ID | Priority | Defect | Evidence of failure | Repair |
|---|---|---|---|---|
| 5.1 | **P1** | Provider accepted the email but the response timed out; the worker re-sent it (customer receives two emails; SMS/WhatsApp charged twice). `Idempotency-Key` is only an email header and gives no de-duplication | G-10: 2 accepted copies | Timeouts and dropped connections after sending are parked as *uncertain* (audited, visible to staff, deliberate re-queue). Failures before sending (connection refused) still retry |
| 5.2 | **P1** | A customer who registered with marketing consent was shown marketing as OFF in the portal (no preference record), and turning it off did nothing: no unsubscribe queued, pending subscribe still sent | F-05, F-06, F-07 failed | Verified opt-in now records the preference; first-ever "off" with prior subscription queues an unsubscribe and supersedes the subscribe; existing accounts repaired by the migration |
| 5.3 | **P1** | A guest who ordered twice then registered was never linked (portal "access not available"); quotations requested before registering never appeared in the portal; signed-in quotations were not attached to the customer | F-10 failed (HTTP 400, no portal access); a probe showed 0 portal quotations after registering | New orders reuse the customer record (same email and phone); link tolerates same-person duplicates; portal lists records matching the verified email; signed-in quotations attached |
| 5.4 | **P2** | Customers were messaged "Your Topline invoice is draft" and "Your Topline quotation is new / lost" (internal states). A change made during this audit briefly also caused a duplicate for signed-in quotations; caught by probe before release | Probe output; N-01, N-04 | Allow-list of customer-meaningful statuses for the two events |
| 5.5 | **P2** | No resend of verification email; "Email not confirmed" shown raw | UI inspection | Resend with cooldown, plain-English errors |

Existing duplicate customer rows are **not merged** (a data operation needing supervision). Their owners now link correctly
and see their orders; history on older duplicate rows remains split across the rows.

## 6. Security controls confirmed in this round

* Worker, webhook, inbound and scheduler endpoints reject missing/wrong secrets and oversized or malformed bodies.
* Inbound content is size-bounded (a 3 MB inbound email stores at most 20,000 characters).
* HTML in user-supplied text is escaped in email HTML (C-06).
* A suppressed (bounced/complaining) address is never mailed: queued messages are cancelled at send time (E-12).
* Direct anonymous inserts into quotation tables are denied (C-14); per-address throttles hold (C-13).

## 7. Remaining blockers and risks

1. **Scheduler:** nothing in the repository calls `operations-scheduler` on a timer. If it is not configured, no email is ever sent.
2. **Provider-side checks** listed in `TOPLINE-PRODUCTION-EMAIL-CHECKLIST.md` (Auth emails, SMTP, SPF/DKIM/DMARC, Brevo key and webhook, inbox tests).
3. Customer password reset is absent (product decision).
4. No customer notices for payment failure, pending or refund (product decision).
5. Brevo may accept a send without returning a message id; such messages cannot be matched to delivery events (G-05).
6. Five channel/function paths were not executed: `sms-inbound`, `whatsapp-webhook`, `sms-delivery-report`, staff conversation replies, `brevo-test-email`.
7. Production schema drift versus the migrations is unknown.

## 8. Conclusion

Code presence, queued messages and green static verifiers were not treated as proof. Everything the application controls
was executed and observed. The final production claim, a real customer receiving real email, remains **unproven** until the
checklist is completed.
