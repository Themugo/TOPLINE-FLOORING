# TOPLINE Master Prompt 1 — Audit and Release Readiness

**Audit date:** 2026-10-14
**Baseline:** `TOPLINE-FLOORING-main-PRODUCTION-FIXED-2026-10-12 (1).zip`
**Scope:** Source-level and static verification of the supplied package; no live production mutations performed.

## Executive result

The supplied package has a substantial verification suite and its static aggregate gate passes. This audit did not identify a new source defect that could safely be changed based only on static evidence without risking an established business contract. Therefore, this pass makes no application-logic, database-migration, payment-rule, or provider-configuration changes. The outstanding runtime checks and documented decisions remain open rather than being marked complete by assumption.

**Release state: NOT CERTIFIED FOR PRODUCTION.** The code-level static gate passes, but dependency-backed tests/build and live external workflow certification were not independently completed in this environment.

## Baseline inventory

| Item | Observed result |
|---|---|
| Architecture | React 18 / Vite / TypeScript / Supabase PostgreSQL |
| Supabase project ref configured in source | `zmbsskvnzjdaxuxlauyx` |
| Active migrations | 116 |
| Edge Function `index.ts` entrypoints | 15 |
| Page files under `src/pages` | 91 |
| TSX files under `src` | 176 |
| npm scripts | 121 after audit repair additions (120 in the supplied baseline) |
| Explicit admin routes in `App.tsx` admin route map | 68, plus separately handled admin root/login |
| SQL test files | 4 |
| Smoke/interaction test files | 7 |
| Git metadata | Not present in ZIP; current Git branch/diff cannot be established |
| Local `.env` | Not present; target is pinned in Supabase config and `.env.example` |

## Checks actually executed in this audit

| Command/check | Result | Evidence/limits |
|---|---|---|
| `node scripts/verify-all.mjs` | PASS, 116/116 aggregate verification checks | Static repository contracts; does not establish production state |
| `node scripts/verify-migration-integrity.mjs` | PASS | 116 active migrations, unique timestamps/order as enforced by verifier |
| `node scripts/verify-database-dependencies.mjs` | PASS | 116 migrations, 163 tables, 244 functions, 288 FK references in dependency model |
| `node scripts/verify-generated-types.mjs` | PASS | Generated type contract, 308,772 bytes |
| `node scripts/verify-remote-deploy-gate.mjs` | PASS | Static deployment safety gate only; no remote mutation |
| `node scripts/verify-schema-contract.mjs` | PASS | Static schema contract |
| `node scripts/verify-sql-runtime-safety.mjs` | PASS | Static SQL runtime-safety rules |
| `node scripts/verify-edge-function-deploy-config.mjs` | PASS | Configuration checked for all 15 functions |
| `node scripts/verify-application-security-trust-boundary.mjs` | PASS | Static trust-boundary contracts |
| `node scripts/verify-payment-webhook-reconciliation-360.mjs` | PASS | Static payment/webhook/reconciliation contracts |
| `node scripts/verify-production-communications-integration-360.mjs` | PASS | Static communications contracts |
| `node scripts/verify-release-candidate.mjs` | PASS with external gates explicitly pending | Includes fail-closed payment-webhook contract and calls for local DB replay/provider UAT |
| `node scripts/verify-vercel-deployment.mjs` | PASS | Static Vercel build/output/security contract only |
| `npm ci --offline --no-audit --no-fund` | BLOCKED | npm cache does not contain `yocto-queue@0.1.0`; package registry access did not complete within the environment timeout |
| Typecheck / lint / build | NOT RUN successfully | Dependency installation did not complete; no valid claim of a fresh pass |
| `npm run test:smoke` | NOT RUN | Vitest/Testing Library dependencies were unavailable after failed dependency restoration |
| Local PostgreSQL migration replay / SQL tests | NOT RUN | No `psql`, Docker, or Supabase CLI was available in this execution environment |
| Live Supabase/Vercel/provider UAT | NOT RUN | No live project/provider access was exercised; no production writes were made |

## Workflow coverage matrix

| Operation/workflow | Source contracts checked | Runtime proof still required |
|---|---|---|
| Public navigation and page loading | Route discovery and render-smoke test harness exist | Re-run all route render tests after dependency install; browser viewport/accessibility review |
| Products, variants, media, cart | Commerce entry-point and variant-aware checkout static gates pass | Live catalogue data, upload, stock reservation and browser checkout tests |
| Services and quotations | Service content authority and quotation interaction tests are present | Real database insert/update/delete and service-installation end-to-end test |
| Checkout and pricing | Server-authoritative order payload/idempotency contracts pass static checks | Real DB transaction, stock/coupon contention, abandoned payment and retry tests |
| Payment initiation and return | Payment provider boundary, reconciliation and release contracts pass statically | Provider sandbox/UAT, callbacks/webhooks, duplicate events, mismatch/overpayment handling and refund UAT |
| Public order tracking/customer portal | Tracking privacy and customer ownership contracts pass static checks | Authenticated and anonymous integration tests against the intended deployed schema |
| Admin authentication/RBAC | Admin authentication, route protection and RPC authorization static gates pass | Verify real role matrix against deployed RLS/grants and session expiry behavior |
| Orders, CRM, projects, field operations | Related static operation verifiers pass | CRUD, workflow transitions, ownership, concurrency and persisted state on local PostgreSQL/live UAT |
| Inventory, procurement, warehouses, delivery | Commerce fulfillment and inventory/procurement static gates pass | Reservation/expiry, stock race, receiving, dispatch and completion lifecycle integration tests |
| Invoices, finance, refunds, reconciliation | Finance and payment trust-boundary static gates pass | Transactional DB tests and finance-role UAT; provider callback reconciliation |
| Brevo/email, SMS, WhatsApp | Communications architecture/provider contracts pass statically | Provider credentials, real delivery, signed callbacks, delivery reports, retries and uncertain delivery reconciliation |
| CMS/site controls/theme settings | Site-control/CMS fail-closed contracts are covered in aggregate static checks | Admin save/reload, invalid theme data, storage/media failures and public rendering against real data |
| Backups, exports, governance, audit | Access-boundary and governance contracts are statically checked | Authorized backup/restore drill, export test and real audit-record review |
| Vercel/DNS/HTTPS | Vercel configuration contract passes | Confirm actual deployment, custom domain, TLS, environment variables and production browser behavior |

## Prioritized findings and decisions

### P0 — Release blockers (external/runtime proof)

1. **Dependency-backed checks are not independently certified in this audit.** Install dependencies in the user's Node 22 environment with network access, then run the exact verification sequence below.
2. **Live Supabase deployment is not certified.** Run a linked dry-run and review pending migrations before an authorized `db push`; never use `db reset --linked` on production.
3. **Payment provider UAT is pending.** Validate M-Pesa and configured card provider paths, webhook signatures, idempotency, retries, provider timeouts, reconciliation and refunds.
4. **Communications provider UAT is pending.** Validate real Brevo, SMS and WhatsApp delivery and callback/report processing.
5. **Production hosting/domain/HTTPS and backup recovery are not proven by static configuration checks.** Perform production smoke and restore drills.

### P1 — Explicit business/financial decisions

1. **Provider overpayment event rollback:** documented behavior indicates that an overpayment exception can roll back the provider event record, leaving no durable record of the received excess amount. This is a financial integrity risk. Do not change it by guessing: define an approved accounting/reconciliation behavior, then implement a regression-tested migration and tests.
2. **Project budget vs. cost ledger:** the current design intends `project_cost_entries` as actual expenditure authority, while project budget configuration may retain budget-planning data. Confirm whether the legacy `expense_items` JSON remains for budget estimates only or should be retired through a separately approved migration. Do not restore duplicate actual-expense authorities.

### P2 — Reliability/UX validation

1. Re-run the existing route smoke tests in both empty-data and simulated database-outage modes.
2. Re-run the latest checkout, quotation, service upload and product edit interaction tests; preserve user-entered values on failure and show actionable provider/database errors.
3. Validate admin workflows with real least-privilege roles, not only the owner/full-permission test profile.
4. Conduct a route-by-route browser sweep for layout errors, broken images, console errors, responsive overflow and accessibility. This is separate from the planned theme unification pass.

## Safe next commands (Windows CMD)

Run from the actual working checkout, not the ZIP extraction path:

```cmd
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm ci
npm run verify:all
npm run test:smoke
npm run typecheck
npm run lint
npm run build
npm run verify:release-candidate
npm run verify:production-readiness
```

If dependency installation fails, capture the full npm error and do not treat later missing-binary errors as application defects. If local Supabase/Docker is available, additionally replay migrations and run the SQL tests against a disposable local database. For production, run only a linked dry-run first, review the exact migration list, then proceed with the separately authorized deployment plan.

## Completion decision

- **Static source gate:** PASS.
- **New application defects repaired in this pass:** None; no new defect was established strongly enough to justify a risky code change based on the available evidence.
- **Build/typecheck/lint/smoke:** NOT independently verified in this environment because dependencies could not be restored.
- **Live database/provider/deployment:** NOT VERIFIED.
- **Production readiness:** NOT CERTIFIED until the listed runtime and external gates are completed.


## Follow-up repair pass — Windows release-verification failures (2026-10-14)

The operator then ran `npm ci` successfully on Windows (Node 22.22.2) and shared the resulting checks. That run exposed three source-verification/tooling defects. These have now been corrected in this audited package without changing application business logic, SQL migrations, payment behavior, provider settings or UI features:

1. **Local environment file handling:** added `scripts/lib-release-environment-check.mjs`. An ignored, untracked `.env.local` in a Git checkout is now treated as a local-development note instead of causing every local verifier to fail. Tracked secrets still fail; release/CI mode still rejects environment files; a source package outside a Git checkout containing such files still fails. No secret contents are read or printed.
2. **Windows smoke-test command:** changed `test:smoke` to invoke the repository-local Vitest entry point through Node, avoiding Windows `.cmd` resolution through a project path containing `&`. Updated the corresponding static contract verifier to accept this explicit Windows-compatible command.
3. **Phase 36–38 stale baseline and nested npm invocation:** updated the reconciliation documentation to the current source-scanned baseline (116 migrations, 163 tables, 244 functions, 288 FK references) and made the verifier invoke the three subordinate scripts directly with the current Node executable. This avoids nested `npm.cmd` resolution problems in the Windows project path and removes obsolete 84-migration documentation assertions.

### Verification after these repairs

| Check | Result | Limits |
|---|---|---|
| `npm run test:release-env-check` | PASS, 3/3 regression cases | Uses temporary Git repositories; verifies ignored-local, tracked-secret and release-mode behavior. |
| `npm run verify:all` | PASS, 116/116 | Static verification only; does not certify production. |
| `npm run test:smoke` in this audit container | BLOCKED | This container's `node_modules` is incomplete and does not contain Vitest. The Windows-compatible command is implemented, but it must be rerun after the operator's successful `npm ci`. |
| Typecheck/lint/build in this audit container | BLOCKED | Same incomplete local dependencies. The operator's submitted Windows log shows typecheck, lint and build commands completed without reported errors before this script-only repair pass; the build completed in 40.23 seconds. |
| Live Supabase/provider/Vercel UAT | NOT RUN | Still requires the proper environment, access and explicit production-safe procedure. |

### Updated release decision

The six failures from the operator's original aggregate run were traced to the environment-file checks and the stale/Windows-fragile Phase 36–38 verifier path. The updated source now passes the full aggregate static suite. The actual Vitest smoke suite must still be rerun in the operator's Windows checkout using the updated `package.json`. Production certification remains pending, and the overpayment handling and project-budget/cost-ledger authority decisions remain unresolved by design.
