# TOPLINE Phase 2: Buyer Onboarding and Communications (audit and fixes)

Date: 2026-10-22. Builds on `TOPLINE-FLOORING-main-E2E-AUDITED-2026-10-20-v5` (126 migrations). Result: 127 migrations.
Scope requested: buyers creating accounts (onboarding), asking for quotations, and general email communication, with Brevo configured.

## 1. Starting point and what is proven

* You report that **owner alert emails are arriving**. That is the strongest evidence available that the Brevo key, sender and
  staff-alert path work in production. It is reported by you; I could not observe it.
* Everything in this report was executed against the real functions and database with provider outcomes simulated
  (see `tests/e2e-communications/README.md`). Supabase Auth emails and real inbox rendering were not run here.

## 2. Findings and fixes (buyer-facing)

| # | Area | Finding (reproduced) | Fix |
|---|---|---|---|
| 1 | Contact | A plain Contact-page message was labelled a **quotation request** to the buyer ("We received your quotation request (RFQ-...)") and to the owner ("New Topline quotation request"). Mutation test reproduced the original wording | Contact messages get their own wording and a `MSG-` reference on both sides |
| 2 | Owner replies | Pressing Reply on an owner alert went to the shared support inbox, not the buyer | Messages can carry their own reply-to; owner alerts reply straight to the buyer |
| 3 | Owners | Only one alert address was read | `quotation_admin_email` accepts up to 5 addresses (comma, semicolon or space separated); each gets its own copy, invalid and duplicate entries ignored |
| 4 | Owner alert content | Little context and no way to jump to the request | Received time in EAT, full details, reply instruction and a link to Admin, Quotations |
| 5 | Buyer acknowledgement | Thin, and no route to follow the request | Lists reference, project, location and timeline; says how to add details; invites them to create an account with the same email. The buyer's free text is deliberately **not** echoed back (that would let a stranger make us mail attacker-written text) |
| 6 | All emails | A bare `<div>`: no brand, footer, contact details or clickable links | Branded responsive template with plain-text alternative. Only links to your own domain become clickable; markup and third-party links stay inert |
| 7 | Welcome | Nothing after verification | One welcome email after the address is verified (never repeated, never for an old verification, never for a bounced address) |
| 8 | Forgot password | Customers had no way to reset a password | "Forgot your password?" with a neutral answer, then a new-password screen |
| 9 | Expired/used links | The portal showed a plain sign-in page with no explanation. Email security scanners use up one-time links, so this is common | Plain-English banner with a way to request a new link, **and** scanner-proof links: the email lands on your site and the token is spent only when the buyer presses a button |
| 10 | Success screens | Quotation and contact screens did not mention the confirmation email or account | Both say a confirmation is on its way, to check spam, and (quotation) invite account creation |

## 3. Evidence

* End-to-end checks for this round: **22 of 22 pass** (`10-buyer-onboarding-and-enquiry-emails.mjs`), on a database built from all 127 migrations. Three
  initial failures were mistakes in my tests (multi-line message parsing, a duplicated event row, an unrealistic "old account"
  scenario) and are recorded in the repair log's transparency section; none were product defects.
* UI tests: 8 password-recovery and scanner-proof-link tests and 6 template tests, all passing.
* SQL regression block 13 passes, and fails when each of three behaviours is reverted (the original wording defect reproduced verbatim).

## 4. What you must do to switch each piece on

| Item | Needed | Where |
|---|---|---|
| Migration `20261022090000_buyer_onboarding_and_enquiry_emails_360.sql` | `supabase db push` | Checklist section 0 |
| Edge function `deliver-communications` (new template and reply-to) | Redeploy | Checklist section 0 |
| Web app (password reset, link handling, copy) | Vercel deploy | automatic |
| Several owner mailboxes | Put them in `communications.email.quotation_admin_email`, e.g. `owner1@..., owner2@...` | Admin Site Control |
| Scanner-proof Auth emails | Paste the four templates from `docs/email-templates/` and confirm the Site URL | Supabase, Authentication, Email Templates |
| Optional | `TOPLINE_SITE_URL` secret (defaults to the production domain; the SQL emails use the same fixed address) | Edge secrets |

Order matters for the last two: you can deploy the code first; old-style Supabase links keep working and show a clear message if expired.

## 5. Decisions for you

1. **Welcome email wording** and whether you also want an owner alert when a new buyer registers (not built; ask if wanted).
2. **New-order email to owners.** Today owners are emailed only for quotations and contact messages; new orders and payments appear in Admin only. Tell me which events should email the owners and to which addresses.
3. Response-time promise: the acknowledgement deliberately does not promise a time. Add one only if you can keep it.
4. Customer-facing status allow-lists from the previous round are still pending your confirmation.

## 6. Remaining limits

Supabase Auth email delivery and rendering, DNS authentication and real inbox tests are still outside what could be run here;
`TOPLINE-PRODUCTION-EMAIL-CHECKLIST.md` lists them. Existing duplicate customer records were not merged.
