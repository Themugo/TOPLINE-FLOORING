# Topline Flooring — Production Deployment Clean Sweep

> **Historical snapshot — superseded.** This report records the 2026-09-14 deployment baseline. Its Supabase project reference (`zmbsskvnzjdaxuxlauyx`), migration/schema counts, and 83/83 verification total are historical evidence only; they are not the current production target or current source inventory. The repository is now pinned to client-owned project `cvjmfplhdlfvqnnmzqcp` with 165 active source migrations. See `DEPLOYMENT.md`, `docs/TOPLINE_RELEASE_CANDIDATE.md`, and the G-21/G-22 reports for current source-level gates. Remote migration history, Vercel deployment state, DNS, provider activation, and business UAT remain external checks unless separately evidenced.

Date: 2026-09-14

## Root cause fixed

The production deployment was failing because `vercel.json` used a full URL as the `redirects[].source` pattern:

`https://www.toplinefloorandwaterproofing.co.ke/:path*`

Vercel redirect sources are pathname patterns. The canonical host redirect has therefore been corrected to a path-only source with a host matcher:

- Source: `/:path*`
- Host condition: `www.toplinefloorandwaterproofing.co.ke`
- Destination: `https://toplinefloorandwaterproofing.co.ke/:path*`
- Permanent: `true`

This preserves the intended www-to-non-www behavior without an invalid source pattern.

## Deployment contract hardened

- Vercel build command remains `npm run build`.
- Output directory remains `dist`.
- Framework remains Vite.
- Node runtime remains pinned to 22.x.
- SPA fallback remains `/index.html`.
- Security headers remain enabled.
- No absolute URL is used as a Vercel redirect source.
- Canonical redirect is restricted to the www host.
- Historical Supabase target at the time of this 2026-09-14 report: `zmbsskvnzjdaxuxlauyx` (retired; see superseding G-21/G-22 evidence).

## Verification

- Vercel deployment verifier: PASSED
- Phase 5 hosting/release verifier: PASSED
- Operation 9 production certification structural gate: PASSED
- Historical full-repository verification at report date: **83/83 passed, 0 failed**
- Historical database dependency snapshot: 80 migrations / 142 tables / 213 static functions / 269 FK references (not the current source inventory).
- Generated database types: not present locally; still requires successful local DB replay before generation
- External Vercel production deployment/UAT: must be confirmed after the commit is pushed

## Important external gates

This package does not falsely certify external production state. After push, verify the actual Vercel production deployment, DNS/domain routing, Supabase Auth URLs, communications providers, and business UAT.
