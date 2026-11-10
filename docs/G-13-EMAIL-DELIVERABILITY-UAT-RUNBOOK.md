# G-13 Email Deliverability Certification Runbook

## Scope and safety

This is a staging/UAT procedure. Do not send unsolicited messages or use customer addresses without a lawful basis. Use mailboxes controlled by the project team. Never paste provider API keys, SMTP passwords, webhook secrets, or access tokens into tickets, logs, CI output, or browser variables. No DNS record values are guessed here: copy exact SPF/DKIM values from the active Brevo domain-authentication screen.

## Domain authentication

Sending domain: `toplinefloorandwaterproofing.co.ke`.

1. In Brevo, authenticate the domain and copy its exact DKIM selector/record(s) and any SPF instructions. Publish only the provider-issued values at the authoritative DNS host.
2. Inspect TXT records from Windows CMD:
   - `nslookup -type=TXT toplinefloorandwaterproofing.co.ke`
   - `nslookup -type=TXT _dmarc.toplinefloorandwaterproofing.co.ke`
   - Query the exact DKIM selector hostname shown by Brevo: `nslookup -type=TXT <selector-hostname>`.
3. Ensure there is one valid SPF policy for the root domain. Merge authorized senders into the existing SPF record; do not publish multiple SPF TXT policies.
4. Publish a DMARC policy at `_dmarc` with a reporting mailbox monitored by the domain owner. Start with an approved monitoring policy, inspect aggregate reports, then tighten enforcement under the domain owner's change process. Do not invent or silently change policy.
5. Confirm Brevo shows domain authentication and sender verification as successful. Save redacted screenshots/export and the DNS observation time/TTL.
6. Check alignment: the visible From domain, DKIM signing domain (`d=`), and SPF MAIL FROM/Return-Path domain should align under the organization's DMARC policy. Capture Authentication-Results from a received message (`spf=`, `dkim=`, `dmarc=`).

## Sender and provider configuration

- Verified sender: `no-reply@toplinefloorandwaterproofing.co.ke`.
- Reply-to: `support@toplinefloorandwaterproofing.co.ke`.
- Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_REPLY_TO_EMAIL`, `COMMUNICATION_WEBHOOK_SECRET`, and `TOPLINE_WORKER_SECRET` only in Supabase Edge Function secrets.
- Configure Supabase Auth Custom SMTP separately using Brevo SMTP relay credentials. API key and SMTP password are not interchangeable.
- Confirm readiness endpoint using authenticated staging worker request; retain response with secrets redacted.

## Controlled inbox test matrix

Run only against a staging project and mailboxes controlled by the test team. Record timestamp (UTC), message type, recipient alias, provider message ID, final provider event and inbox outcome.

1. Supabase Auth: signup verification, resend verification, password reset, magic link.
2. Transactional: quotation acknowledgement, order confirmation, admin RFQ alert.
3. Provider response: delivered, soft bounce, hard bounce, blocked, spam complaint and unsubscribe where test-provider support permits.
4. Retry behavior: transient provider failure; ambiguous timeout; duplicate/replayed webhook; duplicate event ID.
5. Consent: marketing opt-in and opt-out; prove opt-out blocks marketing sync but does not suppress legitimate transactional mail. Never use a real recipient without consent.
6. Inspect inbox, spam/junk, headers and links. Check SPF/DKIM/DMARC alignment, TLS delivery, From/Reply-To, rendering on mobile, text alternative, and link host. Confirm message ID is persisted in outbox attempt history and callback updates durable delivery state.
7. Confirm bounce/complaint suppression is durable and subsequent sends are blocked as designed. Confirm webhook rejects missing/incorrect secret and oversized/malformed payloads.

## Windows CMD source checks

```cmd
npm ci
npm run verify:g13-email-deliverability
npm run verify:g06-customer-communications
npm run verify:brevo-email
```

## Closure evidence

Attach redacted DNS records and lookup output, Brevo authenticated-domain/sender status, Supabase Auth SMTP configuration proof (no credentials), staging readiness response, controlled mailbox evidence and raw Authentication-Results headers, provider message IDs, delivery/bounce/complaint callback evidence, suppression proof, and a dated sign-off from the domain/email owner. Do not mark G-13 closed based on source checks, a provider API acceptance response, or DNS presence alone.
