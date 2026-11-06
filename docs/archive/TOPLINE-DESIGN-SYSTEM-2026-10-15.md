# TOPLINE design system and page redesign — 2026-10-15

Foundation: `TOPLINE-FULL-PROJECT-MY-ACCOUNT-CART-QUOTATION-DEEP-REBUILD-2026-10-14.zip` (which already contained the earlier payment, runtime and test fixes). **No database, migration or catalogue change.** Products, services, projects, categories, images and customer data are untouched; only presentation code changed.

## The palette (one source of truth: `tailwind.config.js` + `src/index.css`)
| Role | Colour | Where it shows |
|---|---|---|
| Ocean navy (brand anchor) | `#0C2D57` (`primary-500`, `navy-900`) | navigation, hero, footer, headings, primary buttons |
| Signal lime (one action colour per screen) | `#B4E33D` (`lime-400`, alias `gold`) | request a quote, pay, place order; navy text on it is 9:1 |
| Petrol | `#0E6B78` (`accent-500`) | links, focus ring, waterproofing, trust |
| Warm concrete neutrals | `#F7F6F3 / #F1EFEB / #E3DFD8` (`gray`, `slate`, `cream`) | page and section backgrounds, borders |
| Service tones | flooring `#3F5E8A`, waterproofing `#0E8A93`, roofing `#8F5B3E` | card edges and tags (`src/lib/service-tone.ts`) |
| Status | success `#166534`, warning `#854d0e`, danger `#b91c1c` | unchanged semantic colours |

Before this change four sources disagreed (Tailwind navy `#142c46`, token spec `#153F69`, CSS defaults, and a stored amber theme `#b45309`), pages mixed three neutral families, and the fonts named in the code were never loaded. Now: the legacy `navy`, `gold`, `accent`, `cream`, `gray` and `slate` ramps all map to the new system, 120 hard-coded `#142C46` and about 200 other hard-coded hex values were remapped, and the runtime theme defaults (`cms-defaults.ts`, `theme-engine.ts`, admin presets) use the same palette.

## Typography
Sora (headings) and Manrope (body), **self-hosted** through `@fontsource-variable/*` and imported in `src/main.tsx`; no third-party font request, CSP-safe. The runtime theme engine knows the families by name.

## What changed per page
- **All pages:** new palette, fonts, unified neutrals, browser theme colour; focus ring is petrol.
- **All public pages:** a phone-first action bar (Call, WhatsApp, Get a quote) below the `md` breakpoint; hidden on cart, checkout and payment return; the floating WhatsApp button is desktop-only. Content gets bottom padding so nothing is covered.
- **Services:** each card has a colour edge and tag for its service tone, taken from the service's own text.
- **Home:** service tiles carry the tone edge.
- **Portfolio:** project cards carry the tone edge.
- **My account:** "Payment needed" banner at the top with a direct "Review and pay" action when orders are unpaid.
- **Shop, cart, quotation, contact, tracking, market:** palette and typography through the shared tokens (no layout change).

## Not done (and why)
- **Hero quote card and product spec rows from the concept boards.** The home hero is a CMS-driven carousel with its own admin-set buttons, and product list queries do not load specifications; adding them needs a data-loading change, so I left them out rather than invent content.
- **Brand images.** `public/images/topline_4.png`, `topline_5.png` and `services/*` are corrupted in this zip (first bytes mangled) and are not referenced by the code. Re-add the originals from your machine.
- **Browser check.** No browser was available here, so layouts were verified by 194 render and interaction tests and the build, not by eye. Please look at each page on desktop and phone before publishing.

## Important after deploying
If an admin ever saved a theme in **Admin → Theme**, that stored theme overrides the code defaults at runtime. Open **Admin → Theme** and choose the **TOPLINE Ocean & Lime** preset (heading font Sora, body font Manrope) and save, so the live site matches.

## Tests added
`tests/smoke/design.test.tsx`: service tone classification (it caught "waterproofing" being read as "roofing" and that is fixed), palette and font contract, mobile action bar present on public pages and absent on cart. The theme contrast checks now cover navy-on-lime. Existing verifiers were updated to the new palette; the service-content verifier now checks intent (persisted features only) rather than variable names.

## Results (local only)
`verify:all` 121/121 · typecheck 0 errors · lint clean · 194 smoke/interaction tests · production build passes (fonts and lime classes in the output).

## Commands (Windows cmd)
```
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
npm ci
npm run verify:all
npm run test:smoke
npm run build
git add -A
git commit -m "TOPLINE design system: ocean navy, signal lime, petrol and warm concrete; Sora and Manrope; service tones; mobile action bar; payment banner"
git push origin main
```
