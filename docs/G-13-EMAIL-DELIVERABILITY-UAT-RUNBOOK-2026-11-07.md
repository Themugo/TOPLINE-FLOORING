# G-13 — Email authentication and inbox deliverability UAT

**Status: OPEN until public DNS, real message headers and controlled-mailbox placement are verified.**

## Scope and safety

Domain: `toplinefloorandwaterproofing.co.ke`  
Application sender configured in source documentation: `no-reply@toplinefloorandwaterproofing.co.ke`  
Provider: Brevo transactional API; Supabase Auth uses Brevo custom SMTP. Existing cPanel human mail must remain intact.

This repository contains no authoritative DNS-zone export, Brevo account DKIM selector/key, live message headers, or controlled mailbox receipt. Therefore this pass does not claim SPF, DKIM, DMARC or inbox delivery is currently passing. Do not guess DNS values or overwrite existing mail records.

## Required DNS records

- **SPF:** exactly one TXT record at the sending domain. Merge all legitimate senders into that one record; do not publish multiple `v=spf1` records. Keep the existing cPanel/human-mail sender authorised if it still sends as this domain. Add Brevo only using the exact include/value shown in the authenticated Brevo domain setup page.
- **DKIM:** publish the exact Brevo-provided selector/host and TXT or CNAME target. Do not infer selector names or key material. Confirm the selector from Brevo and the `s=` value in a real message's `DKIM-Signature`.
- **DMARC:** TXT at `_dmarc.toplinefloorandwaterproofing.co.ke`. Start with a monitored policy if senders are not fully inventoried, use a monitored `rua` mailbox, analyse reports, then stage `quarantine` and `reject`. Do not enforce before every legitimate sender is aligned. Never invent the report mailbox.
- **MX:** preserve existing cPanel MX records for human mail unless a separately approved mailbox migration is planned. Brevo outbound authentication does not require replacing cPanel MX.

## DNS audit

Run from an internet-connected Node 22 environment:

```cmd
set TOPLINE_EMAIL_DOMAIN=toplinefloorandwaterproofing.co.ke
set TOPLINE_DKIM_SELECTOR=REPLACE_WITH_EXACT_BREVO_SELECTOR
npm run audit:g13-email-dns
```

If the selector is unknown, omit it; the report will explicitly show `SELECTOR_REQUIRED`, not falsely claim DKIM is missing. The script queries Cloudflare and Google DNS-over-HTTPS independently and writes `artifacts/g13-email-deliverability/dns-audit.json`. It is read-only and does not change DNS. SPF include-chain lookup count and DMARC alignment still require a full record review and message-header evidence.

## Provider and sender setup

1. In Brevo, authenticate the exact sending domain and copy the generated SPF/DKIM records. Keep the cPanel MX and human mail configuration unchanged.
2. Confirm the sender `no-reply@toplinefloorandwaterproofing.co.ke` and reply-to `support@toplinefloorandwaterproofing.co.ke` are verified in Brevo.
3. Confirm the application Edge secrets are present in Supabase's secret store: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_REPLY_TO_EMAIL`, `TOPLINE_WORKER_SECRET`, `COMMUNICATION_WEBHOOK_SECRET`. Do not record values.
4. Configure Supabase Auth > Custom SMTP separately using Brevo's SMTP login and SMTP key/password (not the transactional API key), host `smtp-relay.brevo.com`, port 587 with TLS.
5. Confirm the scheduler/worker and authenticated Brevo delivery webhook are deployed. Provider acceptance/message ID is not proof of mailbox delivery.

## Real inbox test

Send one test each through:
- Brevo transactional test function;
- Supabase Auth password reset or signup verification;
- normal staging quotation/order notification.

Use controlled Gmail and Outlook mailboxes where available. For each message:
1. Capture UTC send and receive timestamps, Message-ID, sender domain, mailbox provider and final folder (Inbox, Spam or Quarantine).
2. Open original message headers. Require `spf=pass`, `dkim=pass`, `dmarc=pass` in `Authentication-Results`; verify DKIM `d=` alignment with the visible From domain and SPF alignment or relaxed/strict DMARC alignment.
3. Check actual Inbox, Spam, Quarantine and provider trace. Record inbox placement separately from mere SMTP/API acceptance.
4. Confirm a genuine Brevo delivery/bounce event reconciles to the same provider message ID/outbox record.
5. Run `npm run verify:g13-inbox-evidence` on a redacted evidence JSON based on `artifacts/g13-email-deliverability/inbox-evidence.template.json`.

Do not place full email addresses, message bodies, access tokens or raw private headers in shared artifacts. Keep original unredacted evidence in restricted operator storage.

## Closure criteria

G-13 remains OPEN until:
- public SPF has exactly one valid record and stays within the RFC 7208 ten-DNS-lookup limit;
- the exact Brevo DKIM selector resolves and real messages carry a valid aligned DKIM signature;
- DMARC exists, reports are monitored, and policy progression is approved without breaking cPanel/human senders;
- real controlled mailbox tests for application transactional and Supabase Auth email show SPF/DKIM/DMARC pass;
- actual inbox placement (not only provider accepted/delivered status) is recorded for controlled Gmail/Outlook recipients;
- Brevo delivery callbacks match the same provider message IDs and failure/bounce cases are recorded.

DNS record publication, Supabase secret changes, SMTP activation and provider configuration require authorised operator access. No DNS or provider settings were changed in this source pass.
