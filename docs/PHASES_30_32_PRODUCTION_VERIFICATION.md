# Phases 30–32 — Production Verification Foundation

## Phase 30 — Migration contract verification

`npm run verify:phases-30-32` statically verifies the active migration chain, required canonical migrations, project binding, forbidden legacy credentials/placeholders, SECURITY DEFINER search paths, and RLS policy/enablement pairing.

## Phase 31 — Security regression harness

`supabase/tests/security_regression.sql` contains database assertions for RLS on sensitive tables and prevents anonymous access policies on protected business data. Run it only against a disposable/local or explicitly approved validation database.

## Phase 32 — Environment and CI hardening

The repository now validates its environment contract and continues to exclude local secrets. CI runs the new static database/environment checks before the application quality checks.

## Real database validation

When Docker and the Supabase CLI are available locally:

```cmd
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
npx supabase test db --local
npx supabase gen types typescript --local > src/types/database.ts
```

Only after local validation and remote migration-history reconciliation should production be considered:

```cmd
npx supabase link --project-ref zmbsskvnzjdaxuxlauyx
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Never use `supabase db reset --linked` for the real Topline project unless the database is disposable.
