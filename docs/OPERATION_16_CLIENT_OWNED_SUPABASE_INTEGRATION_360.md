# Operation 16 — Client-Owned Supabase Integration 360

## Canonical production identity

- Supabase project ref: `zmbsskvnzjdaxuxlauyx`
- Supabase API URL: `https://zmbsskvnzjdaxuxlauyx.supabase.co`
- Supabase region: `eu-central-1`
- PostgreSQL major version: `17`
- Ownership model: client-owned Supabase account/project

## Repository rule

The Topline repository must contain exactly one canonical production Supabase project reference. Historical documents must not point readers to a retired project. Local development remains local and never uses the production database for resets.

## Production safety

Use migration inspection and dry-run before deployment:

```cmd
npx supabase login
npx supabase link --project-ref zmbsskvnzjdaxuxlauyx
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db lint --linked
```

After review, production migrations may be applied with `npx supabase db push --linked`.

**Never run `supabase db reset --linked` against the production project.**

## Security hardening

Operation 16 removes public and authenticated execution of the bootstrap `public.rls_auto_enable()` SECURITY DEFINER function. Application RPCs remain explicitly permissioned by their individual migrations.
