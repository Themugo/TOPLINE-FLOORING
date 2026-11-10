# G-13 — Email Deliverability Certification Report

Date: 2026-11-07  
Status: **OPEN — DNS and inbox evidence not available in source package**

## Audit findings

- Existing source config uses Brevo for transactional application email and Supabase Auth custom SMTP.
- Existing docs specify the sender `no-reply@toplinefloorandwaterproofing.co.ke` and reply-to `support@toplinefloorandwaterproofing.co.ke`.
- Existing docs already require SPF, DKIM and DMARC, but there was no dedicated repeatable public-DNS audit utility or structured real-inbox evidence validator in the package.
- The package does not contain authoritative zone records, the exact Brevo DKIM selector/key, a real message's `Authentication-Results`, or a controlled mailbox receipt. The actual state cannot be asserted from source code.
- Existing cPanel human mail must remain working; DNS changes must preserve MX and consolidate SPF rather than creating a second SPF record.

## Changes delivered

1. Added `scripts/audit-g13-email-dns.mjs`, a read-only Cloudflare + Google DNS-over-HTTPS audit for MX, SPF, DMARC and the exact DKIM selector supplied by the operator. It does not guess DKIM selectors or modify DNS.
2. Added `scripts/verify-g13-inbox-evidence.mjs` to validate redacted controlled-mailbox evidence for actual Inbox placement and SPF/DKIM/DMARC pass.
3. Added `artifacts/g13-email-deliverability/inbox-evidence.template.json`.
4. Added a detailed DNS/provider/Auth/inbox UAT runbook with safe record publication and cPanel mail-preservation requirements.
5. Registered npm commands and CI source checks.

## Verification

- Existing G-13 source contract — PASS (all assertions).
- New inbox evidence validator — PASS on fail-closed missing-evidence behavior; no fake pass fixture used.
- JSON/package/CI syntax — PASS.
- DNS lookup attempt in this isolated environment — BLOCKED (outbound DNS/network unavailable); no public record results were obtained.
- No real mailbox email was sent; no provider webhook or inbox placement was observed.
- No DNS, cPanel MX, Brevo account, Supabase Auth SMTP, Edge Function secret, or production setting was changed.

## Release/closure decision

**G-13 remains OPEN.** This archive provides repeatable read-only checks and a controlled UAT path, but does not claim SPF/DKIM/DMARC or inbox delivery pass. Closure requires actual DNS answers from public resolvers, exact Brevo selector verification, real message headers showing aligned `spf=pass`, `dkim=pass`, `dmarc=pass`, and actual controlled mailbox Inbox receipt for both application and Auth email.

## Next action

Run the DNS audit in an internet-connected Node 22 environment with the exact Brevo DKIM selector, then complete the real Gmail/Outlook inbox tests and retain redacted evidence.
