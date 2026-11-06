# TOPLINE Services — Deep Catalogue Audit & Public Experience Rebuild

Date: 2026-10-14  
Source reviewed: `TOPLINE-FLOORING-main.zip` (repository snapshot), plus the service-enhancement ZIP to compare the most recent Services page.  
Scope: public Services listing, public service-detail route, service data hook/type, admin service editor/upload path, service-related SQL migrations and smoke test, service image assets, and boundaries with the product catalogue.  
Safety: source-only changes. No database writes, migrations, service/product records, storage objects, IDs, route definitions, quotation workflows, product code, or homepage/navigation code were changed.

## Executive result

The Services page has been rebuilt as a shorter, image-led, premium service-discovery and quotation experience. The detail route has a compatibility fallback for service records whose database does not yet expose the `slug` column. This is a source-level mitigation for public detail navigation; it is **not** a replacement for deploying the existing catalogue migration, and it does not fix service creation when the connected database is missing `services.slug`.

The broader audit found a genuine data-contract/deployment issue and a media-integrity concern. Those are called out separately rather than concealed with a visual patch.

## 1. Findings from the existing implementation

### Public Services index

1. The hero was text plus decorative capability cards, with no large image-led proof of the service work. It occupied substantial vertical space before the customer reached the catalogue.
2. The page had search, category filtering, service cards, quote links and a distinct loading/error/empty/no-match state. These are valuable existing behaviours and were retained.
3. Category labels were derived from service names rather than a canonical category field. This is currently necessary because the service contract inspected has no dedicated public service-category property. Classification remains display-only; it does not mutate the catalogue.
4. The previous page did not clearly prioritize the service provider's work and quote journey over material/product discovery. The new hierarchy emphasizes work scope, site conditions and quotation, and mentions materials only as inputs to the work.
5. The service count and filtered results are based on the loaded active service records; no local fixture catalogue or fabricated service rows were added.
6. The page previously had a potential misleading fallback path: a service with no image uses the shared placeholder-image library. The rebuilt page still uses the existing fallback utility for graceful rendering, but the code and report do not claim fallback images are actual Topline project photographs. Catalogue-managed `image_url` remains preferred.
7. The catalogue-fetch error is now visibly distinct from a genuinely empty active catalogue and includes a retry action.

### Service detail route

1. The existing detail route queried `services.slug` directly. If the deployed PostgREST schema does not contain that column, the route cannot load the service even when the service row exists.
2. The detail loader previously converted all errors into a not-found state, which made a missing column/network failure indistinguishable from a genuinely absent or inactive service.
3. A safe read-only fallback now loads active service rows and matches the route slug against the stored slug when available, or a normalized service name when the slug field is absent. Existing `/service/:slug` routes and quotation/contact destinations remain unchanged.
4. Image error handling now prevents repeated fallback loops if the fallback itself fails.
5. Unverified claims about a “free” consultation have been removed from the detail CTA copy. No warranty, certification, customer review, project count or performance statistic has been added.

### Data hook and service contract

- `useServices({ activeOnly: true })` remains the canonical public list source and continues ordering by `display_order`, then `created_at`.
- Service IDs remain React keys and the source record's name, description, short description, image URL and features remain authoritative.
- Search operates only over fields already loaded from the service record. Filters are client-side display filters; no database schema or query semantics were changed.
- Product data and product upload/variant/cart/checkout paths were not edited.

### Admin service editor and upload path

- The current admin editor generates a slug for new records, preserves the slug when editing, uploads images through the existing `ImageUpload` component and writes service metadata through the existing `useServices` hook.
- Existing smoke coverage checks add-service success, unique-slug generation, permission failures and image-upload rejection. This is useful but stubbed: it is not proof that the connected Supabase project accepts the write or that a storage upload persists and renders after reload.
- The page rebuild deliberately does not modify the admin editor, image uploader, storage policy or catalogue write contract because doing so without the connected schema/provider evidence could mask the actual deployment issue.

## 2. Confirmed/high-priority issue requiring follow-up

### P0 — `services.slug` migration deployment is not proven

The repository contains the additive migration `20260930170000_service_catalog_and_communications_worker_hardening.sql`, which adds `slug`, backfills missing values, makes it non-null, and creates a unique index. The repository also has service upload integrity migration `20261001110000_catalog_product_service_upload_integrity_360.sql`.

The prior reported end-to-end error `column services.slug does not exist` is consistent with the target database/PostgREST schema cache not exposing the expected column. A migration file being present in Git does not prove it has been applied to the intended Supabase project. This blocks the admin create-service write because the form sends `slug`, and it can break the direct detail lookup. The detail-route fallback in this patch only mitigates public reads; it cannot make a missing-column insert succeed.

**Required next step:** run the existing safe production DB preflight / migration-status checks against the explicitly confirmed project ref, inspect pending migrations and the actual `services` table schema, then follow the project's approved migration deployment process. Do not create a competing migration, edit migration history, reset the linked database, or blindly push all migrations as part of this UI rebuild.

## 3. Media audit

The repository snapshot includes files named `public/images/services/topline_1.png`, `topline_2.png`, and `Topline_3.png`, but their byte streams begin with UTF-8 replacement-character bytes before/inside the PNG signature and Pillow cannot decode them as PNG images. The ZIP snapshot therefore does not provide usable local Topline service photography in those paths. The public page prefers image URLs saved on existing service records and falls back through the already-established placeholder utility; it does not treat the broken local files as authentic imagery.

**Required next step:** recover the original image binaries from the authoritative source/backup or upload approved real job photographs through the existing admin media workflow. Verify MIME type, file size, public URL, image rendering and refresh persistence. Do not replace these assets with fabricated “completed Topline project” images.

## 4. Rebuild delivered in this patch

- Compact responsive hero with a real image slot sourced from existing catalogue-managed service media first.
- Reduced vertical spacing so users reach the catalogue sooner while keeping readable typography and full-size controls.
- Premium deep navy/slate/ivory/champagne visual hierarchy consistent with the current site direction.
- Service-first copy: work scope and site requirements lead; materials are supporting context.
- Responsive catalogue cards, search, dynamic display categories, count, loading skeletons, error/retry, empty catalogue and no-match states.
- Existing service record IDs, active-only query, sort order, fields, SEO hook, `/services`, `/service/:slug`, `/quotation` and `/contact` routes retained.
- Public detail route can resolve a normalized-name slug if the database slug column is not yet available for reads.
- Product/shop source, home page, shared navigation, Supabase schema, migrations, RLS, storage policies and production data untouched.

## 5. What is still needed for a truly complete Services capability

1. **Schema deployment proof:** verify the intended Supabase project's live `services` columns, constraints, index and PostgREST schema-cache visibility.
2. **Service create/edit/upload integration:** run an isolated staging test with an authorized admin; create a service, upload an allowed image, reload, edit it, toggle active state, and verify the public page reflects the persisted row and image. Do not run destructive tests against production.
3. **Image recovery:** repair/replace only after retrieving valid original image files or approved project photography.
4. **Service/product relationship:** there is no verified UI contract in this pass for associating products/materials with each service. Do not infer relationships by matching product names. If desired later, design it against existing relational fields/constraints and confirm the business workflow before changing schema.
5. **Category governance:** categories are currently derived from service names. A proper admin-managed category taxonomy may improve consistency, but would require an approved existing-field or schema design; this patch intentionally does not add a database field.
6. **Quotation continuity:** verify in staging that the quotation flow can capture the intended service and preserve it through submit/notification. The current public CTA links were preserved, but the flow has not been represented as live-tested here.
7. **Responsive and accessibility QA:** visually inspect at 360, 390, 768, 1024, 1280 and 1440 px; test keyboard focus, image failures, long service names, filter overflow, loading/error states and screen-reader announcements.
8. **Build/test certification:** run typecheck, lint, full build, project verification and service upload E2E in the local Node 22 checkout. This packaging environment does not contain the installed project dependencies, so no successful compiler/build result is claimed.

## 6. Validation truth

- Source-level structural checks: performed after edits.
- TypeScript typecheck: not run here (dependencies unavailable in this workspace).
- ESLint: not run here.
- Vite production build: not run here.
- Browser visual/responsive review: not run here.
- Live Supabase schema/migration status: not checked in this audit; no credentials were used.
- Real service upload/storage persistence: not run.
- Product catalogue/checkout regression: no product code was changed; still run the existing project verification suite locally.

## Recommended local verification (Windows CMD)

```cmd
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm run typecheck
npm run lint
npm run build:all
npm run verify:all
npm run test:e2e:services-installation
```

If any command fails, stop and inspect the specific error before committing. Keep unrelated working-tree changes unstaged. Commit/push only after reviewing `git diff --check`, `git diff --stat` and `git diff --name-only`.


## Hero sizing refinement
The services hero vertical padding was set from `py-14 / sm:py-16 / lg:py-20` to `py-10 / sm:py-11 / lg:py-14`. This reduces the vertical padding component by approximately 29%, 31%, and 30% at the respective breakpoints, rather than shrinking the typography or primary actions.
