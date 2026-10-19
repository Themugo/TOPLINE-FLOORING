# Audit 2026-10-16: public write surface, enquiry email abuse, communications

Scope: whole system (database, edge functions, web app, release tooling). Method: every migration applied to a clean
PostgreSQL 16 with the repo shim, each issue reproduced as the `anon` / `authenticated` role before fixing, each fix
re-tested afterwards, then the complete verification suite.

## Fixed

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Critical | `public.public_projects` view was writable by `anon`/`authenticated`; writes through a view bypass RLS on `projects` (edit, insert, delete live listings). | Views read-only for browser roles; generic revoke loop; `security_barrier` on the view. |
| 2 | High | `anon` could INSERT directly into `quotations`, `leads`, `contact_messages` (skipping RPC validation, setting status/customer_id). | Public insert policies dropped; RPC is the only public path. |
| 3 | High | `submit_quotation_request` had no rate limit and the 15 Oct trigger emailed any typed address with attacker text. | Per-email (3/h, 8/day) and per-phone (5/h) limits, 2-minute duplicate guard, ack cap 2/recipient/day, staff alert email cap 30/h, requester text flattened and stripped of links. |
| 4 | Medium | Quotation emails contained literal `\n` instead of line breaks. | Real line breaks; asserted by regression test. |
| 5 | Medium | Brevo hard-bounce / spam / unsubscribe events were stored but never acted on. | `communication_suppressions`; bounced/complaining recipients cancelled at claim time; marketing disabled on complaint/unsubscribe. |
| 6 | Medium | Failed marketing subscribe could re-subscribe someone after a later unsubscribe. | Older queued rows superseded; worker re-checks newer unsubscribes and suppressions. |
| 7 | Medium | `payment-initiate` accepted any https `return_url` (token appended) and did not require https for the gateway `checkout_url`. | Return URL limited to Topline origins; https-only checkout URL; browser navigates via `navigateToPaymentUrl`. |
| 8 | Low | Worker secrets and the card HMAC compared with `===`/`!==`. | `constantTimeEqual` everywhere. |
| 9 | Low | Trigger functions and `TRUNCATE/TRIGGER/REFERENCES` were granted to browser roles. | Revoked; asserted by regression test. |
| 11 | High | Guest orders send email/SMS/WhatsApp to an unverified email and phone, greeting by a visitor-chosen name (links and line breaks allowed): a phishing channel and an SMS-cost vector. | `{{customer_name}}` sanitized; volume guard trigger on `communication_outbox` (12 SMS/WhatsApp and 30 emails per recipient per day, 300 SMS/WhatsApp per hour site-wide; staff messages, conversation replies and staff alerts exempt). |
| 12 | Medium | Guest orders reserve stock for 24 h with no limit: a script could reserve the catalogue and block real customers. | At most 5 open unpaid orders per email or phone per 24 h (idempotent retries still answered). |
| 13 | Medium | Variants, images, specifications, documents and tag/collection links of inactive products, and photos/services of unpublished projects, were readable by anyone (bare `true` policies). | Child-table read policies follow the parent's visibility; staff keep permission-based read; regression test blocks any new bare-`true` public policy outside a short reference-table allow-list. |
| 14 | Medium | `get_payment_provider_release_gate_360` (production payment certification evidence and notes) was executable by every logged-in customer. | Service role only; its sole caller is the `payment-initiate` edge function. |
| 15 | Low | `site_settings` was readable in full by anyone. | Public read limited to an allow-list (`custom_css`). |
| 16 | Low | Business report CSV did no quoting (a product name containing a comma shifted every following column) and did not neutralise spreadsheet formulas. | `src/lib/csv.ts` (RFC 4180 quoting, formula guard, UTF-8 BOM) with unit tests. |
| 17 | Low | `robots.txt` did not list `/payment-return`. | Added (page already sets `noindex`). |
| 18 | Medium | Inbound email/SMS/WhatsApp (content anyone can send) was stored with no length cap, including the raw provider payload as a second copy: one oversized email could write megabytes twice. | Sender 320, subject 500, body 20,000, media URL 2,048, payload 64 KB (marker with original size above that); idempotency unchanged. |
| 19 | Medium | Sign-in password field enforced `minLength=8`, locking out customers whose existing password is 6-7 characters (Supabase default minimum). | Length is enforced at registration only; browser autocomplete hints added. |
| 20 | Low | Auth policy (email confirmation, password length, redirect allow-list) lived only in the dashboard; a `supabase config push` could reset it to defaults. | Codified in `supabase/config.toml` (confirmations on, 8-character minimum, redirect URLs, double-confirm email change). |
| 21 | Low | Hot-path queries added by this audit would degrade with table growth (measured at 200k outbox / 60k queue rows: staff-alert cap 23 ms, marketing-queue lookup a full scan); three growing-table foreign keys had no index. | Five indexes: cap query 23 ms to 0.1 ms, lookup 7 ms scan to 0.03 ms index. |
| 10 | Housekeeping | `.env.example` missing, migration manifest stale (118 files, 89 listed), stale verifier string, `ws`/`dompurify` advisories, duplicate outbox index, no long cache for fingerprinted assets. | Restored/refreshed/updated; production `npm audit` now 0. |

## Reviewed and left unchanged (well built)
- Data export function and RPC (caller's own JWT, `require_staff_permission('system','read')`, audit event); CSV importer parser; all 15 edge functions authenticate callers (secret, signature, JWT or token); every customer-private page sets `noindex`; no hard-coded credentials or JWTs anywhere in the tree.
- `track_order_public`: order numbers carry 32 bits of randomness plus an exact phone match, so enumeration is impractical.
- `create_secure_customer_order` pricing, stock locking and idempotency; `apply_payment_provider_event` (unique event ids, payload-hash replay detection, amount/currency conflict and overpayment checks); payment webhook signature and timestamp handling; storage bucket policies; `save_site_page_block` internal permission check; CSP and security headers.

## Evidence
- 123 migrations apply from empty; `security_regression`, `public_surface_regression`, `browser_rpc_grants`,
  `plpgsql_static_analysis` (plpgsql_check) and `runtime_contracts` pass.
- `public_surface_regression.sql` was mutation-tested: re-granting view UPDATE, TRUNCATE, or a public insert policy each fails it.
- typecheck, lint, 195 smoke tests, production build, and `verify:all` 132/132 pass.

## Not verifiable from the repository (external launch gates)
- Supabase Auth: "Confirm email" ON (marketing opt-in relies on a verified address); minimum password length and leaked-password protection.
- Brevo: sender domain SPF/DKIM/DMARC, webhook pointed at `communication-provider-webhook` with its secret, a live send and a live bounce test.
- Set `TOPLINE_WEB_ORIGIN` for any staging origin that must start payments (return URLs are now origin-checked).
- M-Pesa Daraja callback secret travels in the callback URL (provider limitation); keep it out of logs/analytics.
- Deploy edge functions: `deliver-communications`, `operations-scheduler`, `expire-reservations`, `payment-callback`, `payment-initiate`.
- Remaining dev-only advisories (vitest/vite chain) need a major-version upgrade; they do not ship to production.

## Also reviewed this round (no change needed)
- All 201 logged-in-callable database functions classified: 182 staff-guarded, 11 customer-bound, 3 uid-bound, 5 public by design; the two id-taking customer functions (`submit_service_case_feedback`, `get_customer_payment_status`) verify ownership. Customer-owned tables expose rows only through `get_current_customer_id()` / `auth.uid()` policies. All inbound webhooks authenticate before reading the body.

## Noted, not changed
- Approved product reviews expose the reviewer's internal `customer_id` UUID. It is not a credential (access is enforced by policy), and hiding it needs a storefront query change, so it is left for a deliberate follow-up.
- `create_operational_data_export` lets a staff member with `system:read` export all customer contact data in one call. It is audited; consider alerting on it.
