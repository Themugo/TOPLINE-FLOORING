# TOPLINE NEXT CONTINUATION REPAIR — 2026-10-01

## Status

This continuation package preserves the existing TOPLINE architecture and product behavior. No feature removals, database resets, migration renames, or unrelated UI changes were introduced.

## Verified locally in this package

- 95 active Supabase migrations
- 95 unique migration timestamps
- Migration ordering is valid
- Catalog/product/service/upload integrity gate passes
- Database contract gate passes
- Database dependency gate passes
- RLS/security/trust-boundary static gates pass
- Payment/refund/provider boundary gates pass
- Project document/storage gates pass
- Customer self-service/RPC trust-boundary gates pass
- Operations 1–18 structural gates pass
- Phase 1–91 static/source gates pass
- Release-candidate gate passes
- Remote-deployment safety gate passes as a static safety gate
- `node scripts/verify-all.mjs` => **96/96 passed, 0 failed**
- `node --check scripts/generate-db-types.mjs` => passed

## Additional repair in this continuation

### Windows database type generation

`npm run db:types` now:

1. Prefers a directly installed Supabase CLI executable instead of `npx.cmd`.
2. Falls back to `npx supabase` when required.
3. Provides a controlled Windows shell fallback.
4. Detects an invalid/non-generated response instead of writing a corrupt `database.ts`.
5. Gives an explicit `subst` workaround if the Windows project path containing `&` still blocks child-process execution.

This is tooling-only. It does not change application runtime behavior or database schema.

## External blockers still requiring the real environment

### 1. Supabase database push

The linked project previously rejected `supabase db push` because the Supabase database password was not available/authorized. Do not place the password in source control or chat.

After obtaining the correct database password, use the local terminal:

```cmd
set SUPABASE_DB_PASSWORD=YOUR_DATABASE_PASSWORD
supabase db push
```

Review the migration plan before accepting it.

**Never run:**

```cmd
supabase db reset --linked
```

against the production project.

### 2. Live catalog schema

The live `services` table was previously missing the current catalog columns. The required migration chain must be applied before the live schema preflight can pass.

Then run:

```cmd
npm run verify:live-catalog-schema
npm run test:e2e:services-installation
```

### 3. Generated database types

After a successful local Supabase database replay:

```cmd
npm run db:types
npm run verify:generated-types
```

If Windows still rejects the project path, use:

```cmd
subst T: "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
T:
cd \
npm run db:types
npm run verify:generated-types
subst T: /D
```

### 4. Final local certification

Run in this order:

```cmd
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
```

The current static package already reports 96/96. The commands above are the dependency-backed Windows certification that must be run in the user's installed project environment.

## Safety rules retained

- Supabase/PostgreSQL remains canonical.
- Mongo remains migration-source only.
- No migration was renamed to manufacture uniqueness.
- No migration history was reset.
- No production database reset is permitted.
- No secrets were added.
- No fake operational data was added.
- No localStorage business persistence was reintroduced.
- No security/RLS controls were weakened.
- No unrelated product features were introduced.
