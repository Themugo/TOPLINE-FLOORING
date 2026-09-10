# Topline Supabase infrastructure

## Authoritative project

This repository is configured for the dedicated Topline Flooring & Water Roofing Supabase project:

- Organization: **Frameworks Suites**
- Project ref: `jypkhvknfgoqrhwzbdwi`
- API URL: `https://jypkhvknfgoqrhwzbdwi.supabase.co`

This project is completely independent of CALQULUS-PMS. Do not substitute the CALQULUS project ref or credentials.

## Migration chain

The active migration chain is intentionally small and canonical:

1. `20260910000000_topline_canonical_schema.sql` — normalized schema baseline.
2. `20260910090000_032_commerce_contract_hardening.sql` — Phase 2 transaction hardening.
3. `20260910100000_033_staff_rbac_audit_foundation.sql` — Phase 3 authentication/RBAC/RLS/audit foundation.
4. `20260910110000_topline_rpc_contracts.sql` — final RPC signatures reconciled to the canonical schema.

`migrations_legacy/` is forensic reference material and must not be deployed.

## Safe activation workflow

The remote database is intentionally **not changed by Phase 5 in this repository build**. First establish the local CLI link, inspect the remote migration history, preview the push, and only then apply migrations.

```cmd
npx supabase login
npx supabase link --project-ref jypkhvknfgoqrhwzbdwi
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

Only after reconciliation is approved:

```cmd
npx supabase db push --linked
```

Never run `supabase db reset --linked` against this project unless the database is explicitly treated as disposable.

## Client configuration

The browser application uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The legacy `VITE_SUPABASE_ANON_KEY` remains a compatibility fallback only. Never put a service-role or secret key in a Vite `VITE_*` variable.

## Type generation

Once remote schema reconciliation is complete, generate authoritative types from the linked project:

```cmd
npx supabase gen types typescript --linked > src/types/database.ts
```

Do not hand-author a production database type file when the remote schema is available.
