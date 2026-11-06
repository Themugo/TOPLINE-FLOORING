# TOPLINE FLOORING — Phase 0 Foundation Recovery & Inventory Report

**Audit date:** 2026-11-06  
**Authoritative foundation:** `TOPLINE-FLOORING-AUDITED-2026-11-06.zip`  
**Original supplied archive:** `TOPLINE-FLOORING-main.zip`  
**Execution status:** **PARTIALLY COMPLETE — source inventory and static verification complete; dependency/runtime gates blocked.**

## 1. Scope and preservation

The audited ZIP was used as the working foundation because it is the latest supplied project state and already contains the earlier Project Document Manager repair and regression assertion. The original ZIP and audited ZIP were both checked for ZIP integrity. The audited archive contains the same source tree plus the previous audit additions/repairs.

No application redesign, feature duplication, business-rule changes, database mutation, provider configuration, deployment, Git commit, or Git push was performed in Phase 0.

## 2. Repository inventory

| Area | Observed inventory |
|---|---:|
| TypeScript/TSX/JS source files under `src` | 279 files |
| SQL migrations | 147 |
| Supabase Edge Function directories | 15 deployable functions plus `_shared` |
| Verification scripts | 148 passing in the aggregate runner |
| Package scripts | 149 |
| Runtime dependencies | 39 |
| Development dependencies | 18 |
| Test files under `tests` | 39 |
| Documentation files under `docs` | 117 |
| Admin child routes in `src/App.tsx` | 69 |
| Admin routes including dashboard/login | 71 |
| Database objects reported by repository dependency verifier | 167 tables, 266 functions, 290 foreign-key references |

The migration inventory spans the canonical schema and successive commerce, RBAC, payment, communications, operations, data-governance and automation additions. The active migration directory contains 147 uniquely timestamped SQL migrations according to the repository's own migration-integrity checks.

## 3. Architecture and dependency map

**Frontend:** React 18 + TypeScript + Vite + Tailwind, TanStack Query, Wouter, Radix UI. Public pages, customer portal and admin portal share the same application.

**Identity and data:** Supabase Auth, PostgreSQL, RLS, RPCs and Supabase Storage. The admin application uses an authentication guard and server-derived staff permissions. Project documents use the existing private `private-documents` bucket and project-scoped object paths.

**Server-side integrations:** Supabase Edge Functions include payment initiation/status/callback/webhook, communication delivery and inbound/outbound webhooks, provider readiness, customer data export, reservation expiry and operations scheduling.

**External provider contracts present in source:** M-Pesa/payment gateway, Brevo email, Africa's Talking SMS and Twilio/WhatsApp. Provider delivery and live callback behaviour remain separate from static source verification.

**Automation dependencies identified in source/docs:** deployed `operations-scheduler`, enabled `pg_cron`/`pg_net`, Vault secrets and registered schedules. The source implementation alone does not certify that schedules are active.

**Deployment/toolchain:** Node.js 22.x, npm >=10, Vercel configuration and GitHub Actions CI. The package lock is present.

The detailed route list is in `AUDIT-0-APPLICATION-ROUTE-INVENTORY.md`. The phase-level traceability register is in `MASTER-WORKFLOW-REGISTER.csv`.

## 4. Verification actually executed

| Command/check | Result |
|---|---|
| Original archive ZIP integrity | PASS |
| Audited archive ZIP integrity | PASS |
| `node scripts/verify-all.mjs` | **PASS — 148/148, 0 failed** |
| `node scripts/verify-project-documents.mjs` | PASS within aggregate runner |
| Repository toolchain verifier invoked by aggregate suite | PASS |
| Project's migration integrity / database dependency / release safety static checks | PASS within aggregate runner |
| Project's payment, communications, admin/RBAC, commerce, fulfilment, privacy and accessibility source contracts | PASS within aggregate runner |

The aggregate suite is the repository's own static verification suite. Its checks establish source-level contracts; they do not establish a live provider transaction, live email delivery, deployed cron execution, remote database state or a full browser journey.

## 5. Dependency installation and runtime checks — BLOCKED

An `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` attempt timed out in this environment. The resulting partial `node_modules` directory did not contain the TypeScript compiler. A subsequent `npm run typecheck` therefore failed with `MODULE_NOT_FOUND` for `node_modules/typescript/bin/tsc`. This is an installation/environment blocker, not a TypeScript diagnostic result.

Consequently, the following were **not verified**:
- Complete dependency installation.
- `npm run typecheck`.
- `npm run lint`.
- `npm run build`.
- `npm run test:smoke` / full Vitest browser-render smoke.
- Local PostgreSQL/Supabase migration replay.
- Browser-based customer/admin end-to-end journeys.

The partial `node_modules` created by the timed-out installation attempt was removed before packaging; it was not part of the supplied archive and must not be treated as a project deliverable.

## 6. Important product/design decision preserved

The existing full-flow report explicitly documents that guest payment resume currently verifies order number plus checkout phone, then requires the checkout email at payment initiation. It does **not** implement email OTP, and the report describes this as an intentional security design decision. The master prompt's phrase “optional email OTP verification” is therefore treated as a decision gate, not permission to introduce a new OTP flow.

The same report states that customer notifications for payment pending/failure/refund are not implemented and remain a product decision. Phase 8 must inspect the actual event contracts and obtain/confirm the intended notification policy before implementing them. No new notification semantics were invented in Phase 0.

## 7. Phase 0 workflow register

`MASTER-WORKFLOW-REGISTER.csv` maps all 17 master phases to their roles, entry points, backend/data dependencies, Phase 0 evidence status and repair phase.

The register intentionally distinguishes:
- Static contracts passing.
- Source implementation present.
- Live runtime/provider verification pending.
- Detailed phase audit not yet performed.
- External authorization or credentials required.

No workflow is labelled fully VERIFIED based only on source inspection.

## 8. Outstanding gates and blockers

1. Restore registry access or provide a working dependency cache; complete `npm ci`.
2. Run typecheck, lint, production build and Vitest smoke.
3. Run local Supabase/PostgreSQL migration replay in an environment with Docker/PostgreSQL/Supabase CLI.
4. Perform a non-destructive linked-project migration dry-run only after the project owner authorizes access.
5. Complete M-Pesa/card sandbox UAT, callback/reconciliation/refund tests.
6. Verify Brevo Auth/transactional email, Africa's Talking SMS and Twilio WhatsApp delivery with authorized provider credentials.
7. Verify scheduler deployment, pg_cron/pg_net, Vault and actual scheduled executions.
8. Run browser journeys and real-device checks for customer and admin roles.
9. Verify production Vercel environment variables, domain/DNS/HTTPS, monitoring and rollback readiness.

No credentials were requested, exposed or used. No production database, customer data, provider settings or deployment was accessed or modified.

## 9. Phase 0 disposition

**Source inventory:** completed.  
**Static verification:** passed 148/148.  
**Dependency installation/runtime verification:** blocked.  
**Phase 1 authorization:** not started.

Per the master phase gate, do not begin Phase 1 until the dependency/toolchain blocker is resolved and the missing baseline runtime checks have been completed. The next exact action is to restore npm dependency installation and execute the typecheck, lint, build and smoke suite; then update this report and register with actual results.
