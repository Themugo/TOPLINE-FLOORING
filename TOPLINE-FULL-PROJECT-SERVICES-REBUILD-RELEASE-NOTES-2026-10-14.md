# TOPLINE full project package — Services deep rebuild
Date: 2026-10-14

## Package basis
This package is based on the supplied `TOPLINE-SERVICES-PREMIUM-ENHANCEMENT-2026-10-14(1).zip` full project archive. It retains the complete project tree and applies the Services deep-rebuild files to that project. The service audit report is included in the project root. Hero vertical padding is reduced by approximately 29–31% across the configured breakpoints.

## Updated application files
- `src/pages/services.tsx`
- `src/pages/service-detail.tsx`

## Preservation constraints
- No product catalogue source files were intentionally modified by this rebuild.
- No Supabase migrations, schema, RLS policies, Edge Functions, storage policies, credentials, or production records were intentionally changed.
- The existing homepage, shared navigation, route map, service IDs, service data hook, quotation destinations and current service records remain the source of truth.
- The Shop was not redesigned in this phase.
- No customer reviews, certifications, warranties, completed projects, service records or prices were invented.

## Deep audit observations
1. The public service detail query uses the `services.slug` column. A reported missing-column response indicates a mismatch between deployed schema/PostgREST cache and repository migration state. The frontend fallback can help resolve a service from the active catalogue only if `select('*')` succeeds; it cannot fix admin insert/update failures caused by a missing database column.
2. Admin create/edit, media upload, public read, service detail routing and quote submission need a controlled end-to-end test against a dedicated staging project. This package does not perform database writes.
3. Actual project imagery must be verified in a browser and in the source media store. The code prefers existing service image URLs and existing placeholder utilities. Image assets bundled in the supplied archive showed unexpected leading replacement-byte sequences during binary inspection, so their browser decoding should be checked before declaring the media library healthy. They have not been replaced with fabricated project photos.
4. The relationship between services and materials/products is not assumed. Any future “materials used” cross-link must use an existing verified relationship or an explicitly designed, separately reviewed data contract—not name-based guesses.
5. Category labels are derived from existing service names for presentation; they do not write category values to the database.

## Validation status
This packaging environment did not run the project's dependency-backed typecheck, lint, Vite production build, full verification suite, or live Supabase integration tests. Run them locally in the established Node 22 environment before committing or deploying. A successful build is not proof that live schema, uploads, storage access or quote persistence are correct.

## Recommended local checks
```cmd
npm ci
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
npm run test:e2e:services-installation
git diff --check
```

Review any generated `public/sitemap.xml` change before staging. The build may regenerate it using static routes when Supabase environment configuration is absent; do not commit that generated difference unless it is intended.
