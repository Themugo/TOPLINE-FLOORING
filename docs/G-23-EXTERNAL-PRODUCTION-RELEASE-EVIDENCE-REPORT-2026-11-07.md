# G-23 — External Production Release Evidence Collection

Date: 2026-11-07

## Scope and limitation

G-22 found that production readiness depended on external control-plane evidence: CI for the
exact release commit, linked Supabase history/dry-run/lint, Vercel deployment and domain state,
Auth UAT, provider tests, communications delivery, business sign-off, DNS and rollback.
These cannot be truthfully executed or certified from this source archive without authorised
access to the customer's accounts and a controlled staging/production session.

## Repairs

1. Added `release-evidence/G-23/release-evidence-register.json` with 13 mandatory criteria
   covering CI, build, Supabase, authentication, Vercel, web smoke tests, payments,
   communications, business UAT, DNS, rollback and approval.
2. Added evidence handling instructions, redaction rules and a safe execution sequence.
3. Added `scripts/verify-g23-release-evidence.mjs`, which rejects unsupported statuses,
   duplicate IDs, path traversal, missing/empty evidence files, and VERIFIED claims without
   owner, timestamp and summary.
4. Added npm commands `verify:g23-release-evidence` and `test:g23-release-evidence`.
5. Added the evidence-register integrity check to CI. Empty/pending evidence is reported
   honestly as NOT CERTIFIED; CI does not fabricate external proof or require credentials.

## Verification

- `node scripts/verify-g23-release-evidence.mjs` — PASS (register structure and fail-closed
  evidence rules; 0/13 external criteria verified).
- `node scripts/verify-g22-release-readiness.mjs` — PASS.
- `node scripts/verify-g21-deployment-reconciliation.mjs` — PASS.
- `node scripts/verify-vercel-deployment.mjs` — PASS.
- `node scripts/verify-release-candidate.mjs` — PASS.
- `node scripts/verify-remote-deploy-gate.mjs` — PASS (165 source migrations).
- `node scripts/verify-phase-5-hosting.mjs` — PASS.
- `node scripts/verify-operation-16-client-owned-supabase.mjs` — PASS.

The full npm CI/build/browser suite was not executed because dependencies are not installed.
No account access, live DB read, migration application, payment, communications send, Vercel
deployment, DNS query/change, production data operation, commit or push was performed.

## Release decision

**NOT CERTIFIED FOR PRODUCTION CUTOVER.** The evidence collection mechanism is now present,
but 0 of 13 external criteria have been verified in this package. The owner must populate the
register with redacted, attributable evidence in an authorised environment and obtain explicit
technical/business approval before cutover.

## Next step

Populate the G-23 evidence register from real account and UAT results. Do not progress to
production activation or DNS cutover based solely on repository verifiers.
