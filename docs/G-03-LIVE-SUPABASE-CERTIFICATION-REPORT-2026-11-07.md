# G-03 — Live Supabase certification

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-02-DATABASE-REPLAY-2026-11-07.zip`  
**Project root:** `TOPLINE-FLOORING-main/`  
**Expected Supabase project:** `cvjmfplhdlfvqnnmzqcp`  
**Expected active migration count:** 163

## Executive result

**G-03 status: OPEN — linked Supabase credentials and target link are not available in this execution environment.** No remote Supabase connection was made. The live migration history, dry-run and linked database lint have not been represented as passed.

## Source corrections

1. Added `scripts/validate-linked-supabase.mjs` and the `npm run validate:linked-supabase` command.
2. The validator requires explicit `TOPLINE_ALLOW_LINKED_DB_READS=true` opt-in.
3. It verifies `supabase/config.toml` and the local Supabase CLI link file both identify `cvjmfplhdlfvqnnmzqcp`. A mismatch aborts before any remote CLI operation.
4. It inventories all 163 local migrations and writes a SHA-256 manifest.
5. It executes only these linked commands:
   - `supabase migration list --linked`
   - `supabase db push --dry-run --linked`
   - `supabase db lint --linked --fail-on error`
6. It writes a command log and JSON summary to `artifacts/linked-supabase-certification/`.
7. Added `scripts/verify-g03-linked-supabase.mjs` and `npm run verify:g03-linked-supabase` to guard the target pin, opt-in, read-only command contract and evidence outputs.
8. Updated `DEPLOYMENT.md` to distinguish linked certification from an approved migration deployment.

## Verification performed here

| Check | Result |
|---|---|
| Validator JavaScript syntax | PASS |
| G-03 source safety verifier | PASS |
| Existing remote deployment safety verifier | PASS (163 migrations) |
| Migration integrity verifier | PASS |
| Migration deployment static verifier | PASS (163 migrations) |
| Explicit opt-in guard | PASS — without opt-in, exits 2 before remote commands |
| Linked project identity | NOT RUN — no local Supabase link file |
| Remote migration history | NOT RUN — no authenticated linked session |
| Linked `db push --dry-run` | NOT RUN |
| Linked database lint | NOT RUN |

## Operator execution — Windows CMD

From the repository root, after confirming the intended Topline Supabase project and that you are authorised to inspect it:

```cmd
npx supabase login
npx supabase link --project-ref cvjmfplhdlfvqnnmzqcp
set TOPLINE_ALLOW_LINKED_DB_READS=true
set TOPLINE_EXPECTED_MIGRATION_COUNT=163
npm run validate:linked-supabase
```

Review these outputs:

- `artifacts\linked-supabase-certification\linked-supabase.log`
- `artifacts\linked-supabase-certification\linked-supabase-summary.json`
- `artifacts\linked-supabase-certification\local-migration-manifest.sha256`

The migration history and dry-run must be manually reconciled. A non-empty dry-run is not automatically safe: inspect every pending migration and its intended effect. If local and remote histories differ, stop and investigate; do not run `migration repair` to make the lists appear aligned.

## Safety boundary

This G-03 validator does not run `db push` without `--dry-run`, `db reset --linked`, `migration repair`, `migration up`, or `config push`. No production database was modified. Any real migration application requires a separate explicit approval after G-02 replay and G-03 review are complete.

## Closure criteria

G-03 can close only when the linked project identity is verified, the complete local/remote migration history is reviewed and reconciled, the linked dry-run is reviewed with no unexplained changes, linked database lint exits successfully, and the three evidence artifacts are retained with the tested commit SHA.
