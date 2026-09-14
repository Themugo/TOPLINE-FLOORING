# Vercel Deployment Hardening

## Production contract

- Vercel uses `npm run build` rather than an internal `node_modules` path.
- `package.json` pins the Vercel Node runtime to Node 22.x.
- Vite produces the production bundle in `dist`.
- `vercel.json` keeps the SPA fallback and security headers.
- `scripts/verify-vercel-deployment.mjs` checks the deployment contract before release.

## Why this was changed

The deployment was failing after dependency installation. The previous configuration duplicated Vite's internal executable path in both `package.json` and `vercel.json`. That couples the deployment to Vite's package layout instead of the package's public CLI contract.

The corrected path is:

`Vercel -> npm run build -> node ./node_modules/vite/bin/vite.js build -> dist`

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
