# Topline Local Validation Contract

This repository treats local validation as a release gate, not an optional troubleshooting step.

## Windows

Keep the checkout in a path without `&` or other command-shell metacharacters. Example:

`C:\Users\<user>\Desktop\TOPLINE-FLOORING-ROOFING`

Run:

```cmd
npm ci
npm run verify:doctor
npm run lint
npm run typecheck
npm run build
npm run validate:local-db
```

`validate:local-db` starts the local Supabase stack, resets it from the 22 canonical migrations, lints the database, runs database tests, and writes generated TypeScript types to `src/types/database.ts`.

## Production safety

Never replace `--local` with `--linked` for a reset. Production reconciliation uses `supabase migration list --linked` and `supabase db push --dry-run --linked` only until the production plan has been reviewed and approved.
