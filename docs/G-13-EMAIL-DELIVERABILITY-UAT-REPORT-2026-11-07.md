# G-13 Email Deliverability UAT Report — 2026-11-07

## Status: OPEN — live domain and mailbox evidence outstanding

### Scope
Source-level deliverability controls and operational runbook were audited on the G-11.1 disaster-recovery foundation. The project uses Brevo for application transactional email and Brevo SMTP relay separately for Supabase Auth mail.

### Source findings
- Transactional worker uses Brevo SMTP email API, server-side sender/reply-to configuration, bounded provider timeout, provider response validation, provider message identity, and durable attempt audit.
- Ambiguous provider outcomes are parked as uncertain rather than blindly retried.
- Provider readiness is authenticated and checks required Brevo secret presence without returning secret values.
- Authenticated provider webhook records delivery callbacks through `record_provider_delivery_event_worker`.
- Bounce/complaint/unsubscribe suppression and consent-aware marketing synchronization are present in the source/migrations.
- Auth email templates exist for signup confirmation, password reset and magic link.
- Existing runbooks require SPF, DKIM and DMARC and explicitly prohibit guessing provider-issued DNS values.

### Static verification
`npm run verify:g13-email-deliverability` is a source-contract check. It does not resolve public DNS, authenticate a Brevo account, send mail, or prove inbox placement. Run it together with the existing G-06 and Brevo checks in CI/local environment.

### Live evidence not supplied
No DNS host access, Brevo authenticated-domain screen, sender verification evidence, Supabase Auth SMTP proof, staging credentials, controlled recipient mailboxes, received message headers, provider message IDs, or delivery/bounce/complaint callback evidence were available in this execution. Therefore SPF/DKIM/DMARC alignment, reputation, inbox placement, bounce handling and end-to-end delivery are NOT VERIFIED.

### Closure gate
G-13 remains OPEN until the runbook's controlled staging matrix is executed and evidence is reviewed. A Brevo API `2xx` alone is acceptance, not proof of delivery or inbox placement. Do not alter production DNS or send customer email as part of this source-only change.

### Change boundary
No production DNS, provider account, Supabase project, customer records, commit, push, or deployment was changed.
