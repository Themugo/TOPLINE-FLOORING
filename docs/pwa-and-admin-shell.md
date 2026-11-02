# Installable app, mobile navigation and admin shell

## Installable web app (PWA)
- `public/manifest.webmanifest` (standalone, brand colours, 4 shortcuts: quote, shop, track order, account).
- Icons in `public/icons/` generated from `public/topline-brand-mark.svg` by `scripts/generate-pwa-icons.mjs` (192/512 "any", 192/512 maskable, 180 Apple touch). Re-run the script if the brand mark changes.
- `public/sw.js`: caches only same-origin static files (`/assets/*`, icons, images, fonts, `/offline.html`). Never touches Supabase, payment providers, other hosts, non-GET requests or HTML pages. Offline navigation shows `/offline.html`.
- Updates apply only when the person taps "Update now" (no mid-checkout reloads). Bump `VERSION` in `sw.js` to purge caches.
- Install prompt (Android/desktop Chrome) and an iOS "Add to Home Screen" tip appear after 20 s, are dismissible (30-day snooze) and are suppressed on cart/checkout/payment screens. Admin sidebar also offers "Install app" / "Update available".
- `vercel.json`: `sw.js` is `no-store` with `Service-Worker-Allowed: /`; manifest has the right content type.
- Service worker registers in production builds only.

## Admin shell
- `src/lib/admin-nav.ts` is the single navigation source: all 68 admin pages in 8 groups. `scripts/verify-admin-shell-and-pwa.mjs` fails if a route is added without a menu entry or permission rule.
- Menu is filtered by the staff member's permissions (display only; RLS and `AdminAuthGuard` remain the authority).
- Desktop: pinned sidebar with its own scroll, collapsible groups (remembered), filter, Ctrl/Cmd+K quick navigate. Phone: slide-in drawer with focus trap, Escape, scroll lock, 44 px targets, safe-area padding, offline banner.
- Layout safety nets for legacy pages: orphan `<label>`s are linked to their field, scrolling tables become keyboard-focusable, pages with their own heading no longer get an empty second `<h1>`.

## Not verifiable here
Real-device install on Android/iOS, iOS Safari behaviour, push/offline data (intentionally not offered), production Vercel header delivery.
