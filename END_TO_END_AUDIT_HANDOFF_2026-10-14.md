# TOPLINE Flooring & Roofing — End-to-End Audit Handoff

Date: 2026-10-14

## Baseline and preservation

This package continues the existing TOPLINE project. It preserves the current Vite/React frontend, Supabase/PostgreSQL migrations and RLS/RPC architecture, Vercel deployment configuration, communications providers, commerce flows, operational modules, theme system, and existing verification scripts. It is not a rebuild.

No production database migration was applied by preparing this package. No production catalogue records, storage objects, payment configuration, or provider secrets were intentionally changed. `.env.local`, `.env`, `.git`, `node_modules`, and `dist` are excluded from the release archive.

## Evidence reported from the user's Windows environment

- `npm ci`: completed; npm reported 37 dependency audit findings (2 low, 8 moderate, 25 high, 2 critical). This is an audit signal requiring package-by-package triage, not proof that every finding is exploitable. No forced dependency upgrade was performed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build:all`: passed; Vite built 2,769 modules. Sitemap generation ran without Supabase build-time configuration and therefore wrote static routes with 0 products and 0 services; this must not be interpreted as proof that the live catalog is empty.
- `npm run verify:all`: reported 117 passed, 0 failed across the registered static/contract checks.
- `npm run test:e2e:services-installation`: read-only run reported 3 passed, 2 skipped, 0 failed. Supabase target matched the canonical project, five service rows were readable with `slug`, and a public service image returned HTTP 200.

## Additional safety hardening in this package

The service-installation E2E script now fails closed before making catalogue/storage requests when the configured Supabase URL is not the canonical project. To run mutation tests against an isolated staging project, the operator must explicitly set `E2E_EXPECTED_SUPABASE_URL` to the exact staging URL as well as enabling `E2E_RUN_MUTATIONS=true` and providing a dedicated test staff account. Production mutations remain blocked unless the separate `E2E_ALLOW_PRODUCTION_MUTATIONS=true` override is explicitly enabled; production mutation testing is not recommended.

The `.env.example` documents the new explicit staging-target variable without containing real credentials.

## Local static verification performed while preparing this archive

- `node --check scripts/e2e-service-upload-installation.mjs`: passed.
- `node scripts/verify-admin-management-uploads.mjs`: passed.
- `node scripts/verify-launch-repair.mjs`: 17/17 passed.
- `node scripts/verify-migration-integrity.mjs`: passed.

A separate tool-container attempt to run the complete TypeScript/lint suite could not start because the pre-existing `node_modules` in that container did not contain `typescript/bin/tsc`. This is an environment limitation, not a reported source failure. The user's Windows environment did run typecheck and lint successfully as recorded above.

## Required remaining release evidence

The read-only E2E result does **not** certify authenticated service create/upload/update/delete or the installation assignment/status RPC lifecycle. Those paths were skipped. Before declaring full end-to-end release readiness:

1. Configure an isolated staging Supabase project and dedicated staff test account; do not paste credentials into chat or commit them.
2. Set `E2E_RUN_MUTATIONS=true`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, and `E2E_EXPECTED_SUPABASE_URL` in a local ignored `.env.local` for that staging target.
3. Run `npm run test:e2e:services-installation` and confirm the mutation lifecycle and cleanup all pass.
4. Run the browser/responsive checks for desktop and mobile; the theme verifier explicitly does not claim browser visual verification.
5. Complete external provider UAT for payment/M-Pesa, Brevo email, SMS, DNS/Vercel, backup/restore and business workflows before production certification.
6. Review `npm audit` findings individually and test any dependency remediation; do not use `npm audit fix --force` as a blanket repair.
7. For migrations, review `supabase migration list --linked` and a linked dry-run first. Do not run `supabase db push` merely to silence a REST API/schema-cache error.

## Windows quick-start

From the extracted project folder, run commands without copying Markdown fence lines:

```bat
npm ci
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
npm run test:e2e:services-installation
```

The E2E test is intentionally read-only unless mutation mode is explicitly configured.
