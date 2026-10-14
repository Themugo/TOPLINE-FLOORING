# TOPLINE Portfolio Page — Deep Audit & Rebuild

Date: 2026-10-14
Base: `TOPLINE-FULL-PROJECT-SERVICES-DEEP-REBUILD-2026-10-14.zip`
Scope: public `/portfolio` page, public project-data helper, portfolio interaction and publication-data contracts. Existing Supabase/Vite/Wouter architecture retained. No database migration, production write, deployment, commit, or push was performed.

## Public page review

The user-provided live page currently renders the portfolio title and CTA but displays **“No Projects in this Category”** and zero projects. It also shows fixed claims (“100% Quality Audited”, “Written 10-Yr Warranty”, “50,000+ m² Installed”) irrespective of database-backed project records. Direct automated access to the live site was unavailable during this pass, so live comparison is based on the user's supplied page text; it is not represented as a browser-certified inspection.

## Findings and changes

1. **Misleading empty state:** the former UI used the same category-empty state when there were no public projects at all. It now distinguishes (a) no published project data, (b) no filter/search matches, and (c) a project-data request failure. Retry is available for request failures.
2. **Unsupported metrics:** removed the hard-coded warranty, quality-audit, and installed-area claims. These must only return after the business supplies verifiable, current figures and a source of truth.
3. **Unverified image/client/location claims:** removed invented fallback descriptions such as “Metropolitan Area”, “Commercial Client”, “Confidential Commercial”, “Full Site”, and “Certified Handover”. Missing values are omitted or described as unavailable; no generic stock image is presented as a completed Topline project.
4. **Portfolio discovery:** added responsive search across project title, description/summary, category, service type, location and materials; category select and quick category chips share one state; filter reset is available when relevant.
5. **Case-study card UX:** responsive card grid, meaningful image fallback, focus-visible treatment, semantic buttons/articles, and details only for fields present in the public data.
6. **Gallery/dialog behavior:** accessible dialog semantics, close button, click-outside close, Escape close, arrow-key image navigation, thumbnail selection, scroll locking, and responsive modal sizing. Project details include challenge, solution, outcome and materials only when those fields exist.
7. **Image-query resilience:** `loadPublicProjects` still treats failure to query the canonical `public_projects` view as a true load error, but a separate `project_images` query failure no longer discards all valid project text. The gallery can fall back gracefully.
8. **Data safety:** public project records continue to be read from the `public_projects` view, not the staff-only `projects` table. The existing project-images query remains separately scoped to returned project IDs. No change was made to database policies or migrations.
9. **Existing build blocker:** removed the known unused `Loader2` import from `src/pages/services.tsx` so the earlier reported lint/typecheck blocker is corrected in this full-project ZIP as well.

## Data contract and workflow notes

- The view `public.public_projects` is designed to expose a safe subset of active projects and excludes internal budget/cost columns. The frontend relies on its published fields (including title, slug, category/service type, description, challenge/solution/results, location, completion date, area size, featured and display order).
- Gallery data is loaded from `project_images` in a separate request. Confirm on the deployed Supabase target that the view exists and is current, active projects have correct `is_active` status, the staff publication form saves that flag, and images are saved with the matching `project_id` and valid accessible URLs.
- A public empty state may therefore be correct if no active projects have been published. This rebuild deliberately does **not** invent case studies or promote inactive projects to public.
- The public page cannot independently fix admin create/edit/publish permissions or missing database schema. Those require a separate authenticated workflow test against the intended Supabase environment.

## Verification status

- Static portfolio contract verifier: included as `node scripts/verify-portfolio-page.mjs`.
- ZIP integrity: must be checked after packaging.
- Typecheck, lint, and production build: run in the local Node 22 checkout because this packaging environment does not have the project dependency installation available for a reliable full Vite build.
- Live Supabase query, authenticated admin create/edit/publish flow, project-image upload/readback, mobile/desktop browser interaction, and Vercel deployment: **not run** in this pass. Do not treat source-level checks as runtime certification.

## Local verification sequence

Run these from the project root, after replacing files from the full-project ZIP or merging its changed files into the existing working tree:

```cmd
node scripts/verify-portfolio-page.mjs
npm run typecheck
npm run lint
npm run build:all
```

Then verify the real publishing lifecycle in the intended non-production/staging environment: create a test project, save/edit it, keep it inactive and confirm it is absent publicly, publish it and confirm it appears in `/portfolio`, attach two images and confirm ordering/gallery controls, unpublish it and confirm it disappears. Verify role permissions and that internal budget/cost fields never appear in the public response. Use real authorized test credentials only in local environment variables; never put secrets in source control.
