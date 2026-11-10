# G-09 — UI and Mobile Browser Certification Runbook

## Scope

Certify the production-built Topline application at desktop, tablet landscape/portrait, and mobile viewport sizes. The automated suite exercises the public home, services, shop, portfolio, contact, quotation, cart, customer portal, order tracking, and public admin-login entrypoints. It checks route hydration, uncaught browser runtime exceptions, document-level horizontal overflow, viewport metadata, and captures representative screenshots.

## Automated viewport matrix

| Profile | Viewport |
|---|---:|
| Desktop | 1440 × 1000 |
| Small desktop | 1280 × 900 |
| Tablet landscape | 1024 × 768 |
| Tablet portrait | 768 × 1024 |
| Mobile | 390 × 844 |
| Small mobile | 320 × 740 |

The automated suite runs 10 routes at each of the six viewports (60 route/viewport checks), plus mobile-menu open/Escape-close/focus-return checks at the three narrowest widths (63 total assertions). It is intentionally read-only: no order submission, payment, production write, or privileged authenticated operation is performed.

## Run locally — Windows CMD

1. Install the project's locked dependencies with `npm ci`.
2. Install Google Chrome or Chromium.
3. Build the production application: `npm run build`.
4. If Chrome is not in a standard location, set its executable path:

```cmd
set "TOPLINE_CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
```

5. Run the suite:

```cmd
npm run verify:g09-responsive-certification
npm run test:g09-responsive-browser
```

The runner uses the production Vite preview, not the development server. It writes `artifacts/g09-browser/browser-summary.json`, `browser-summary.md`, and desktop/tablet/mobile screenshots.

## CI

GitHub Actions runs the static contract and, after the Vite production build, executes the same Chromium suite. The CI runner must provide Chrome/Chromium. The browser summary and screenshots are uploaded as the `topline-g09-responsive-browser` artifact even when a test fails.

## Acceptance criteria

- All route/viewport combinations hydrate and render non-empty application content.
- No uncaught browser JavaScript exceptions.
- No document-level horizontal overflow at any tested viewport.
- Responsive viewport metadata is present.
- Desktop, tablet, and mobile screenshot evidence is retained.
- Existing navigation and route definitions remain intact.
- Keyboard focus visibility, reduced-motion handling, and mobile safe-area padding remain present.

## Manual physical-device and authenticated acceptance still required

Automated Chromium viewport emulation is not a substitute for physical iOS/Android hardware. Before closing G-09, perform manual acceptance on at least one real Android phone and one iPhone/iPad or equivalent iOS browser, plus desktop Chrome/Edge and Safari where available. Use staging accounts for customer and staff/admin journeys. Verify keyboard appearance, touch interactions, browser chrome/safe areas, file uploads/camera selection, dialogs, tables, long forms, payment return, and authenticated admin navigation. Capture device/browser versions and screenshots. No production credentials or customer data should be included in evidence.

## Current evidence boundary

The browser/device acceptance has not run in this local pass. The source verifier can run without browser dependencies. The browser suite requires the production build and a locally installed Chrome/Chromium. A successful CI browser artifact proves the listed route/viewport smoke checks only; it does not certify every authenticated business workflow, every browser engine, or physical-device behavior. G-09 remains OPEN until CI browser evidence and manual device/staging acceptance are reviewed.
