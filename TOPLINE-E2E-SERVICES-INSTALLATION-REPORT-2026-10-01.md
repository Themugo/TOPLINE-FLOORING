# Topline Services + Upload + Installation E2E Run Test

Date: 2026-10-01

## Purpose

This test covers the actual application contracts for:

1. public service catalogue read;
2. service creation;
3. service image upload to the `images` Supabase Storage bucket;
4. public retrieval of the uploaded image;
5. persistence of the image URL on the canonical `services` row;
6. service read-back;
7. temporary installation creation;
8. active staff assignment through `assign_installation_staff`;
9. installation transition `scheduled -> in_progress -> completed` through `update_installation_status`;
10. assignment removal;
11. temporary installation cleanup;
12. temporary service cleanup;
13. temporary image cleanup.

## Safety

The runner is read-only by default.

Mutation mode requires:

- `E2E_RUN_MUTATIONS=true`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

Mutation mode refuses the canonical production Supabase project unless:

`E2E_ALLOW_PRODUCTION_MUTATIONS=true`

The test creates uniquely named temporary records and performs best-effort cleanup on failure.

## Static foundation result

`npm run verify:all`

**95/95 passed, 0 failed.**

The static suite confirms the service catalogue, storage, installation workforce RPCs, database contracts, authorization boundaries, migration chain and deployment contracts are internally consistent.

## Real-environment E2E result

The mutation runner must be executed against a real Supabase environment with a real staff account. It is intentionally not marked as passed merely from source inspection.

Run:

```cmd
set E2E_RUN_MUTATIONS=true
set E2E_ADMIN_EMAIL=your-staff-account@example.com
set E2E_ADMIN_PASSWORD=your-password
npm run test:e2e:services-installation
```

For a staging Supabase project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to that staging project first.

## Local launch runner

`TOPLINE-E2E-SERVICES-INSTALLATION.cmd` runs:

- `npm ci`
- `npm run typecheck`
- `npm run build:all`
- `npm run test:e2e:services-installation`

This gives one repeatable pre-launch command for the service/upload/installation path.

## Remaining proof

A successful mutation run is the required evidence that the complete service upload and installation workflow works against the actual Supabase environment. Provider, Vercel, DNS, Brevo and other external systems remain separate UAT gates.
