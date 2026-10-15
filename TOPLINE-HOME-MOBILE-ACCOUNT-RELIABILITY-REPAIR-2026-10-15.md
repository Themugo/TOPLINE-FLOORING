# Topline Flooring & Roofing — Home/Mobile/Account Reliability Repair

Date: 2026-10-15

## Foundation and scope

This package continues the existing TOPLINE-FLOORING project and keeps the Ocean/Lime/Petrol design system, CMS-driven hero, catalogue-backed products/services, existing navigation, customer portal, checkout, and database migration history. It is not a redesign or a new project.

## Root cause addressed

The supplied local test log shows `src/pages/home.tsx` begins with a closing `</div>` fragment rather than a TypeScript/TSX module. That syntax failure explains the ESLint parser error, TypeScript parse errors, Vite/esbuild build failure, and cascading route/interaction test failures. The full 731-line homepage from the last known project ZIP has been restored. The image URL quote replacement was also corrected to use a valid regex without an unnecessary escape. Existing CMS/catalogue content, responsive hero sizing, variant-aware product controls, mobile navigation, and customer flows are preserved.

## Verification performed in this environment

- `scripts/verify-home-mobile-account-reliability.mjs`: 15/15 passed
- `scripts/verify-homepage-premium-mobile.mjs`: 12/12 passed
- `scripts/verify-premium-redesign-safety.mjs`: 14/14 passed
- `scripts/verify-commerce-entrypoints-360.mjs`: passed
- `scripts/verify-all.mjs`: 127/127 passed
- ZIP integrity: checked after packaging

Dependency installation in this environment did not complete, so local ESLint, TypeScript, Vitest smoke tests, and production Vite build were not represented as passing here. Run the included Windows verification command in the actual project environment after extracting/replacing files. Do not treat static verification as production or browser certification.

## Apply safely

1. Extract this ZIP to a new folder for review; do not overwrite the current project until you confirm the extracted files.
2. If merging into the existing checkout, preserve `.env.local`, `.git`, and local-only configuration. This ZIP intentionally excludes `.git`, `node_modules`, and `.env.local`.
3. Run `TOPLINE-HOME-MOBILE-ACCOUNT-RELIABILITY-VERIFY.cmd` from the extracted project root.
4. Review `git diff --check` and `git status --short` before committing. No commit or push is performed by this package.
