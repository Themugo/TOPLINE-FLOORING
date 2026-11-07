# G-04 — Frontend build certification

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-03-LIVE-SUPABASE-CERTIFICATION-2026-11-07.zip`  
**Project root:** `TOPLINE-FLOORING-main/`  
**Scope:** reproducible dependency installation, ESLint, TypeScript and Vite production build in GitHub Actions.

## Executive result

**G-04 status: OPEN — GitHub Actions execution evidence required.** The workflow has been strengthened so each frontend gate is an independently visible CI step and frontend build evidence is uploaded even if a gate fails. The current audit environment could not complete `npm ci`: requests to `registry.npmjs.org` failed with `EAI_AGAIN` (DNS/network unavailable). The partial installation did not provide ESLint, and therefore lint, TypeScript and Vite production build were not executed successfully here. No green CI run is claimed.

## Source changes

1. Retained `npm ci` as the clean, lockfile-driven install gate. Added explicit `package-lock.json` cache dependency path to Node 22 setup.
2. Split the previous combined frontend quality block into independent CI steps:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build` (Vite production build; existing `prebuild` sitemap generation remains active).
3. Added `scripts/record-frontend-certification.mjs`, which records commit SHA when available, Node/npm versions, package engine constraints, lockfile SHA-256 and exact commands under `artifacts/frontend-certification/`.
4. Added `scripts/verify-g04-frontend-build.mjs` and `npm run verify:g04-frontend-build` to protect the CI contract.
5. Added an always-run Actions artifact upload for frontend certification evidence and `dist/`, retaining artifacts for 14 days.
6. Did not alter application source, dependencies, dependency versions or package lock.

## Verification performed in this environment

| Check | Result |
|---|---|
| G-04 CI contract verifier | PASS |
| Validator scripts JavaScript syntax | PASS |
| CI YAML parse and step inventory | PASS |
| `package.json` parse | PASS |
| `package-lock.json` present | PASS |
| `npm ci` | BLOCKED — npm registry DNS/network `EAI_AGAIN`; command timed out while retrying |
| `npm run lint` | NOT RUN successfully — ESLint package unavailable after incomplete install |
| `npm run typecheck` | NOT RUN — dependencies incomplete |
| `npm run build` | NOT RUN — dependencies incomplete |

## CI closure criteria

G-04 can close only after a GitHub Actions run on the exact reviewed commit SHA demonstrates:

- `Install dependencies` (`npm ci`) — success
- `Frontend lint (ESLint)` — success
- `Frontend TypeScript certification` — success
- `Frontend production build (Vite)` — success
- `dist/` artifact present and non-empty
- `frontend-certification-environment.json` artifact present and records the same commit SHA

If any step fails, retain and inspect the full Actions log and artifact before changing source. Do not use `npm install` to rewrite the lockfile as a workaround for an install failure; resolve the actual lockfile, registry, or environment issue.

## Operator execution

After copying the changed files into the existing repository, push only after review and explicit approval. Then inspect the Actions run for the resulting commit SHA. The CI quality job itself runs `npm ci`, lint, TypeScript and the production build. Download `topline-frontend-certification-<sha>` and confirm the environment JSON and `dist/` output.

No Git commit, push, deployment, production database change or dependency upgrade was performed during this remediation.
