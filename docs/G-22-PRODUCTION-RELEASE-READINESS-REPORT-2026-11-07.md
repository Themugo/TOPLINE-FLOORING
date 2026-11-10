# G-22 — Production Release Readiness & Deployment Evidence Reconciliation

Date: 2026-11-07

## Scope

Reconcile the current source-controlled release contract, Vercel deployment configuration,
canonical Supabase identity, CI quality gates, and historical deployment evidence. This is a
source-level certification only; it does not assert that production services are live or healthy.

## Findings and repairs

1. `PRODUCTION-DEPLOYMENT-CLEAN-SWEEP-REPORT.md` was dated 2026-09-14 but still stated that
the retired Supabase project `zmbsskvnzjdaxuxlauyx` was the dedicated target and repeated
obsolete migration/schema counts. A prominent historical/superseded notice now prevents
those values being mistaken for current deployment facts.
2. Current deployment source is consistently pinned to client-owned Supabase project
`cvjmfplhdlfvqnnmzqcp` (`https://cvjmfplhdlfvqnnmzqcp.supabase.co`) and 165 active SQL
migrations. This matches G-21's current reconciliation.
3. Vercel source configuration uses `npm run build`, Vite, `dist`, SPA fallback, security
headers, canonical www-to-apex redirect, and public site URL. Static verifier covers the
contract; it does not prove that a Vercel project has deployed this configuration.
4. The release candidate sequence correctly places local replay, linked migration inspection
and dry-run, provider sandbox UAT, business UAT, deployment, and DNS cutover behind explicit
gates. Production migration application and DNS changes remain approval-controlled.
5. Added a G-22 verifier and CI/package scripts to keep the canonical identity, source migration
count, Vercel contract, release gates, and historical-report warning aligned.

## Verification matrix

| Area | Source-level result | External evidence still required |
|---|---|---|
| Canonical Supabase identity | PASS — repository config and deployment docs agree | Authenticated linked migration list, remote history and advisor/lint review |
| Migration inventory | PASS — 165 active source files | Confirm remote history and approved dry-run plan |
| Vercel config | PASS — static configuration and verifier | Vercel production deployment logs, domain attachment and HTTPS/redirect check |
| CI release gates | PASS — required static and build steps are declared | Successful CI run on the exact release commit |
| Payment provider | FAIL-CLOSED by design until real adapter/provider is configured | Provider sandbox/UAT, webhook signature and refund/reversal evidence |
| Communications | Source integration contracts exist | Sender/domain authentication and real delivery callbacks |
| Auth and business UAT | Documented release gates | Real production/preview UAT and sign-off |
| DNS and rollback | Safe sequence documented | DNS owner approval, actual records, rollback test and old-site retention |

## Tests executed

- `node scripts/verify-g22-release-readiness.mjs` — PASS
- `node scripts/verify-g21-deployment-reconciliation.mjs` — PASS
- `node scripts/verify-vercel-deployment.mjs` — PASS
- `node scripts/verify-release-candidate.mjs` — PASS
- `node scripts/verify-remote-deploy-gate.mjs` — PASS (165 source migrations)
- `node scripts/verify-phase-5-hosting.mjs` — PASS
- `node scripts/verify-operation-16-client-owned-supabase.mjs` — PASS

Full npm CI, lint, typecheck, Vite build and browser suite were not run in this packaged environment
because project dependencies are not installed (`node_modules` absent). No remote Supabase
connection, Vercel API/deployment, DNS query/change, provider transaction, production data
operation, commit or push was performed.

## Release decision

**NOT CERTIFIED FOR PRODUCTION CUTOVER by this source-only pass.** The repository release
contract is internally aligned, but external evidence in the matrix remains mandatory. Do not
apply production migrations, activate payment providers, switch DNS, or retire the existing
WordPress/cPanel service until the corresponding gates are evidenced and approved.

## Next action

Run the documented release sequence in an authorised staging/production session, capture
evidence against the matrix, and only then request the next gap.
