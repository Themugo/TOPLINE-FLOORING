# Vercel Deployment Hardening

## Production contract

- Vercel uses `npm run build` rather than an internal `node_modules` path.
- `package.json` pins the Vercel Node runtime to Node 22.x.
- Vite produces the production bundle in `dist`.
- `vercel.json` keeps the SPA fallback, security headers, and a host-constrained canonical redirect.
- `scripts/verify-vercel-deployment.mjs` checks the deployment contract before release.

## Why this was changed

The deployment was failing because the canonical-host redirect used a full URL as the Vercel `source` pattern. Vercel redirect sources are pathname patterns; host-based redirects must use a path-only `source` plus a `has` host matcher. The corrected rule redirects only the `www` host while preserving the requested path. The build remains delegated to `npm run build`.

The corrected deployment path is:

`Vercel -> npm run build -> node ./node_modules/vite/bin/vite.js build -> dist`

The corrected canonical-host routing is:

`/:path*` + host `www.toplineflooringandwaterproofing.co.ke` -> `https://toplineflooringandwaterproofing.co.ke/:path*`

Node 22.x is pinned because Vercel supports Node 22.x for builds and recommends explicit major-version selection rather than an open-ended range.

## Verification

Run locally:

```cmd
npm ci
npm run verify:vercel
npm run lint
npm run typecheck
npm run build
```

A successful Vercel deployment must still be verified in the Vercel deployment logs after the commit is pushed.
