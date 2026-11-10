# G-09 — UI and Mobile Browser Certification Report

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-08-SECURITY-CERTIFICATION-2026-11-07.zip`  
**Status:** OPEN — browser/device acceptance pending

## Executive summary

G-09 adds a repeatable production-build Chromium certification harness and CI gate for desktop, tablet landscape/portrait, and mobile viewport checks. It preserves the existing React/Vite application, public and admin route definitions, and existing design system. It does not claim that physical-device or authenticated workflow testing has been completed.

## Source audit findings

The existing source already includes responsive foundations that should be retained rather than redesigned wholesale:

- `index.html` uses a responsive viewport declaration with `viewport-fit=cover`.
- Global styles include keyboard-visible focus, reduced-motion handling, touch-action behavior, and mobile-safe-area treatment.
- Existing navigation verification checks the complete admin route/sidebar contract, including a mobile drawer, Escape handling, focus behavior, and 44px touch targets.
- Existing accessibility/SEO and navigation contracts remain in place.

No broad CSS redesign was introduced in this gap. The remediation is focused on making viewport/browser regression checks executable and part of CI.

## Changes delivered

1. Added `scripts/test-g09-responsive-browser.mjs`, a dependency-free Node 22 Chrome DevTools Protocol runner using an installed Chrome/Chromium executable.
2. Added a 10-route matrix: home, services, shop, portfolio, contact, quotation, cart, customer portal, order tracking, and admin login.
3. Added six viewport profiles: 1440px desktop, 1280px small desktop, 1024px tablet landscape, 768px tablet portrait, 390px mobile, and 320px small mobile.
4. The browser runner checks hydrated route content, document-level horizontal overflow, uncaught JavaScript exceptions, and responsive viewport metadata. It captures home and admin-login screenshots for each viewport profile.
5. Added `scripts/verify-g09-responsive-certification.mjs` (16 source/CI contract assertions), package scripts, and CI execution after the production build.
6. Added mobile-menu interaction checks for opening the menu, closing it with Escape, and returning focus to the menu toggle at 768px, 390px, and 320px.
7. Added CI artifact upload for JSON/Markdown browser summaries and screenshot evidence.
7. Added `docs/G-09-UI-MOBILE-BROWSER-CERTIFICATION-UAT-RUNBOOK.md` with Windows CMD instructions and manual-device acceptance requirements.

## Verification performed in this workspace

| Check | Result |
|---|---:|
| G-09 responsive source verifier | PASS — 17/17 |
| Existing accessibility/SEO contract | PASS — 10/10 |
| Existing admin shell/navigation/PWA contract | PASS — 34/34 |
| Existing navigation master contract | PASS — 9/9 |
| Node syntax checks for both new scripts | PASS |
| `package.json` JSON parse | PASS |
| Existing `package-lock.json` JSON parse | PASS |

## Not run / evidence boundary

- The production Vite build was not run in this workspace because the extracted project has no `node_modules` directory.
- Dependency installation was attempted with `npm install --package-lock-only`; it timed out in this environment. No dependency was added and the lockfile was not intentionally modified.
- The Chromium suite was not run here because the production `dist/` build is absent. Therefore no actual desktop/tablet/mobile browser result or screenshot is represented as passed in this report.
- Physical Android/iOS device testing, Safari/Edge engine coverage, authenticated customer/staff/admin workflows, file upload/camera behavior, and real payment/communications journeys remain pending.
- G-08 live staging RLS/RPC/Storage tests remain OPEN; G-09 does not change that status.

## How to execute

On Windows CMD, from the project root:

```cmd
npm ci
npm run build
set "TOPLINE_CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run verify:g09-responsive-certification
npm run test:g09-responsive-browser
```

If Chrome is available on PATH or at a standard installation path, the environment variable is optional. Review `artifacts\g09-browser\browser-summary.json`, `browser-summary.md`, and all generated PNG screenshots. The same browser suite is registered in GitHub Actions and uploads the evidence artifact after the build.

## Closure criteria

G-09 remains OPEN until:

1. CI production build succeeds and the 60 route/viewport browser checks pass with screenshots retained.
2. Desktop Chrome/Edge and Safari where available are manually reviewed.
3. Real Android and iOS/iPadOS browser acceptance is completed and recorded.
4. Authenticated customer and staff/admin staging journeys are exercised, including forms, dialogs, tables, long content, navigation, upload, and keyboard/touch interactions.
5. Findings are fixed and the final evidence is reviewed. Browser emulation alone is not sufficient for physical-device certification.
