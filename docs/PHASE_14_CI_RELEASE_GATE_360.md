# Phase 14 — CI & Production Release Gate 360

## Objective
Make every change to `main` pass the same deterministic quality and architecture gates before it can be treated as release-ready.

## Delivered
- GitHub Actions uses Node 22 and `npm ci` for deterministic dependency installation.
- CI uses least-privilege `contents: read` permissions and avoids `pull_request_target`.
- Workflow concurrency cancels superseded runs for the same branch/PR.
- Repository/toolchain, Supabase target, migration, payment, commerce, order, authorization and release contracts run before frontend compilation.
- ESLint, TypeScript and production Vite build are mandatory gates.
- The production build is uploaded as a CI artifact for inspection/handoff only after every verification and frontend quality gate succeeds.
- Phase 15–17 lifecycle verification and Operations 17–18 production automation and theme-governance checks are explicit CI steps.
- CI has explicit job timeout protection so a stalled external/database operation cannot run indefinitely.
- A dedicated Phase 14 source verifier checks that the workflow itself cannot silently lose critical gates, omit current lifecycle/operations contracts, or upload a build artifact before all gates pass.
- Migration timestamps are checked for uniqueness and strict chronological ordering.
- Secret-bearing local environment files are rejected by the release-gate verifier.

## Release rule
A green CI run means the repository passed source-level architecture checks and dependency-aware frontend quality checks in GitHub Actions. It does not claim that the production Supabase database has been migrated or that payment-provider UAT has completed.

## External deployment sequence
1. Confirm CI is green on the intended commit.
2. Compare local and linked Supabase migration history.
3. Run `supabase link` against the dedicated Topline project.
4. Run `supabase db push --dry-run --linked`.
5. Reconcile any already-applied migration identifiers before changing production history.
6. Apply approved migrations.
7. Complete provider UAT and production smoke tests.

## Verification
Run:

```text
npm run verify:phase-14-ci-release-gate
npm run verify:migration-integrity
npm run verify:release-candidate
npm run lint
npm run typecheck
npm run build
```

Local Supabase replay remains environment-dependent because it requires the Supabase CLI and Docker runtime.
