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
| 10 | Housekeeping | `.env.example` missing, migration manifest stale (118 files, 89 listed), stale verifier string, `ws`/`dompurify` advisories, duplicate outbox index, no long cache for fingerprinted assets. | Restored/refreshed/updated; production `npm audit` now 0. |

## Evidence
- 119 migrations apply from empty; `security_regression`, `public_surface_regression`, `browser_rpc_grants`,
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
