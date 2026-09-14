# Topline Flooring — Production Deployment Clean Sweep

Date: 2026-09-14

## Root cause fixed

The production deployment was failing because `vercel.json` used a full URL as the `redirects[].source` pattern:

`https://www.toplineflooringandwaterproofing.co.ke/:path*`

Vercel redirect sources are pathname patterns. The canonical host redirect has therefore been corrected to a path-only source with a host matcher:

- Source: `/:path*`
- Host condition: `www.toplineflooringandwaterproofing.co.ke`
- Destination: `https://toplineflooringandwaterproofing.co.ke/:path*`
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
- Dedicated Supabase target remains `zmbsskvnzjdaxuxlauyx`.

## Verification

- Vercel deployment verifier: PASSED
- Phase 5 hosting/release verifier: PASSED
- Operation 9 production certification structural gate: PASSED
- Full repository verification: **83/83 passed, 0 failed**
- Database dependency contract: 80 migrations / 142 tables / 213 static functions / 269 FK references
- Generated database types: not present locally; still requires successful local DB replay before generation
- External Vercel production deployment/UAT: must be confirmed after the commit is pushed

## Important external gates

This package does not falsely certify external production state. After push, verify the actual Vercel production deployment, DNS/domain routing, Supabase Auth URLs, communications providers, and business UAT.
