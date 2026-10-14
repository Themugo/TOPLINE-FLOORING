# Topline Flooring & Roofing — End-to-End Foundation Update

Date: 2026-10-14
Source foundation: `TOPLINE-END-TO-END-PRECOMMIT-CLEANUP-2026-10-14.zip`

## Changes made

1. Restored the missing `.env.example` public configuration contract. It pins the dedicated Topline Supabase URL and canonical website URL and uses a placeholder for the public publishable key. It contains no real credentials and does not document server-only secret names in the browser environment template.
2. Registered the existing service upload/installation smoke test in `package.json` as `npm run test:e2e:services-installation`.
3. Hardened `scripts/e2e-service-upload-installation.mjs`:
   - Reads `slug` and `image_url` from the public service endpoint.
   - Treats an API missing-column response as a schema-cache/project-target diagnostic; it no longer recommends blindly pushing migrations or editing migration history.
   - Removes the invalid expectation that a public/anon API key can read the Storage bucket-administration endpoint.
   - In read-only mode, checks an existing same-project public service image if one is present; otherwise reports a clear skip. Actual object upload, read-back, persistence, and cleanup remain in opt-in mutation mode.
   - Keeps mutation mode disabled by default and preserves the explicit production mutation guard.
4. Kept existing migrations and production data untouched. No migration was applied, no migration-history record was edited, and no production mutation was performed.

## Verification performed

- `node scripts/verify-all.mjs` — **117/117 passed**.
- `node scripts/verify-admin-management-uploads.mjs` — passed.
- `node scripts/verify-migration-integrity.mjs` — passed; 116 active migrations.
- `node scripts/verify-schema-contract.mjs` — passed; 116 active migrations.
- `node scripts/verify-theme-unification.mjs` — passed; 17/17 theme runtime tests and 10/10 WCAG AA contrast pairs.
- `node scripts/verify-phase-14-ci-release-gate.mjs` — passed.
- `node scripts/verify-environment.mjs` — passed.
- `node scripts/verify-launch-gap.mjs` — passed.
- `node scripts/verify-toolchain.mjs` — passed with Node 22.16.0.
- `node --check scripts/e2e-service-upload-installation.mjs` — passed.
- `package-lock.json` JSON parse — passed.
- The user separately confirmed the live Supabase REST read returned HTTP 200 and included `slug` for `roof cover`.

## Not represented as complete

- A full Vite production build, typecheck, and lint run were not completed in this packaging environment because dependency installation did not finish. Run them locally after `npm ci`.
- The E2E mutation workflow was not run: it requires an authenticated test account and explicit mutation opt-in. Run it against isolated staging first; production mutation is blocked by default.
- No live migration deployment, provider UAT, Vercel deployment, DNS change, or production data mutation was performed.
- Browser visual/responsive verification remains pending, as the existing theme verifier reports.

## Local validation commands

```cmd
npm ci
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
npm run test:e2e:services-installation
```

The last command runs the safe read-only checks by default. For mutation testing, use a dedicated staging project and test account, set `E2E_RUN_MUTATIONS=true`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD`, then run the command. Never put real credentials in the ZIP or source control.
