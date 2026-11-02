# Client Acceptance and Release Readiness

**Assessment date:** 2026-11-02  
**Source baseline:** `TOPLINE-FLOORING-main-PHASE2-BUYER-COMMS-2026-10-22-v6 (3).zip`  
**Release status:** **BLOCKED — source-level verification passes; external/runtime acceptance remains incomplete.**

## Scope and baseline

The supplied archive contains 924 files, 127 active SQL migration files with unique 14-digit timestamp prefixes, React 18, TypeScript, Vite, Supabase/PostgreSQL, Supabase Edge Functions, Vercel configuration and existing Brevo/payment integration code. It has no Git metadata and no pre-existing `node_modules` directory.

The archive is an earlier foundation than the 2026-10-26 runtime acceptance ZIP named in the accompanying prompt. This report therefore records findings from the actual supplied archive and does not assume that later changes exist. The assessment runtime was Node.js `v22.16.0` and npm `10.9.2`.

## Verified in this workspace

| Area | Result | Evidence |
|---|---|---|
| Existing aggregate static verification | PASS | `npm run verify:all`: 131/131 after corrections; payment and M-Pesa live UAT scripts are intentionally excluded from the static aggregate |
| Release safety regression tests | PASS | `node scripts/test-release-safety-guards.mjs`: 4/4 |
| Local database reset guard | PASS | `node scripts/validate-local-supabase.mjs` without opt-in exits 2 before Supabase CLI execution |
| Migration filename inventory | PASS | 127 migration files; 127 unique timestamp prefixes |
| Theme engine | PASS | Existing aggregate suite reports 17/17 |
| ZIP integrity | PASS | Original archive passed `ZipFile.testzip()` |
| Dependency installation | BLOCKED | `npm ci --no-audit --no-fund` timed out; npm log records repeated `EAI_AGAIN` fetching registry.npmjs.org tarballs. Partial `node_modules` output was removed before packaging. |
| Browser acceptance | NOT RUN | No browser session or deployed test environment was available |
| Local database replay | BLOCKED | No disposable Supabase environment was provisioned; destructive reset now requires explicit opt-in |
| Service mutation lifecycle | BLOCKED | Requires isolated staging URL, staff test credentials and explicit mutation opt-in |
| Payment/M-Pesa UAT | BLOCKED | Requires isolated sandbox/staging endpoint, exact expected hostname, test order and provider test data |
| Brevo delivery acceptance | BLOCKED | Requires approved test recipient and provider-side configuration/access |
| Production deployment parity | NOT RUN | No deployment or production mutation was authorised |

## Corrections made

- Added an explicit opt-in guard before any local Supabase start/reset/lint/test command.
- Removed the production-mutation override from the service lifecycle E2E test. Canonical production mutations are now unconditionally blocked.
- Added explicit environment, endpoint-host matching, HTTPS and mutation opt-in checks to payment webhook UAT.
- Added equivalent target and mutation controls to M-Pesa initiation UAT. Missing prerequisites now exit as BLOCKED rather than returning a success-like pending exit code.
- Added four regression tests for these safety boundaries.
- Added this client-facing evidence and handover documentation.

## Outstanding acceptance requirements

1. Restore npm registry access and complete `npm ci` using the committed lockfile.
2. Run typecheck, lint, Vitest smoke tests and production build with complete dependencies.
3. Run full Supabase migration replay, database lint and SQL tests against a disposable local instance.
4. Verify the actual staging schema and PostgREST schema cache, including `public.services.slug`.
5. Run authenticated service create/upload/update/delete and installation lifecycle against isolated staging.
6. Run provider-approved payment and M-Pesa sandbox UAT.
7. Verify Brevo delivery to approved test recipients.
8. Run browser-based desktop, tablet and mobile acceptance.
9. Complete deployment parity, backup/recovery and client-owner sign-off.

## Release decision

**BLOCKED.** Source-level checks and safety corrections are not equivalent to a working deployed system. Do not represent this package as production-certified or ready for unconditional client handover.
