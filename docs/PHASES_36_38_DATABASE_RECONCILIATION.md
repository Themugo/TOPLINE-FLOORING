# Phases 36–38 — Database Reconciliation & Deployment Safety

This initiative closes the gap between the canonical SQL design and safe execution against PostgreSQL.

## Phase 36 — Local PostgreSQL validation orchestrator

`npm run validate:local-db` is the controlled local execution path. It starts Supabase locally when Docker/Supabase CLI is available, resets **local only**, lints the database, runs SQL regression tests and generates local TypeScript types. If the local runtime is unavailable, the script explicitly reports that validation was not executed rather than claiming success.

## Phase 37 — Dependency and type contract

`npm run verify:database-dependencies` checks active migrations for unresolved internal table references and verifies the RPC contracts used by the application. Current static result: **10 migrations, 85 tables, 39 functions**.

`npm run db:types` is the authoritative type-generation command:

```cmd
npx supabase gen types typescript --local > src/types/database.ts
```

`npm run verify:generated-types` checks the generated artifact when present. The repository deliberately does not fabricate database types.

## Phase 38 — Remote deployment safety gate

`npm run verify:remote-deploy-gate` verifies:

- dedicated Topline project binding
- canonical active migration count
- migration naming format
- no destructive `DROP SCHEMA public`
- no historical plaintext credentials in active migrations

The gate does **not** deploy anything.

After local validation succeeds, use:

```cmd
npx supabase login
npx supabase link --project-ref jypkhvknfgoqrhwzbdwi
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db lint --linked
```

Review the dry-run before any real `db push`.
