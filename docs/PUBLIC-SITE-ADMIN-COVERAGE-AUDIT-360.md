# Public Site → Admin Coverage Audit 360

Generated: 2026-09-14T11:49:12.541Z

| File | Hard-coded text | Hard-coded images | Static links |
|---|---:|---:|---:|
| src/pages/about.tsx | 6 | 0 | 1 |
| src/pages/cart.tsx | 22 | 0 | 2 |
| src/pages/checkout-success.tsx | 8 | 0 | 2 |
| src/pages/compare.tsx | 2 | 0 | 0 |
| src/pages/contact.tsx | 26 | 2 | 1 |
| src/pages/custom-page.tsx | 2 | 0 | 0 |
| src/pages/faq.tsx | 10 | 0 | 1 |
| src/pages/home.tsx | 5 | 2 | 4 |
| src/pages/industries.tsx | 10 | 0 | 3 |
| src/pages/market.tsx | 5 | 0 | 1 |
| src/pages/not-found.tsx | 3 | 0 | 1 |
| src/pages/order-confirmation.tsx | 10 | 0 | 2 |
| src/pages/portal.tsx | 46 | 0 | 1 |
| src/pages/portfolio.tsx | 23 | 1 | 3 |
| src/pages/quotation.tsx | 55 | 1 | 1 |
| src/pages/service-detail.tsx | 11 | 0 | 5 |
| src/pages/services.tsx | 16 | 0 | 4 |
| src/pages/shop-detail.tsx | 18 | 0 | 3 |
| src/pages/shop.tsx | 29 | 0 | 1 |
| src/pages/track-order.tsx | 22 | 0 | 1 |
| src/components/layout/Header.tsx | 2 | 0 | 5 |
| src/components/layout/Footer.tsx | 6 | 0 | 3 |

## Interpretation

- Product/service/catalog data is already CMS/database sourced.
- Header/footer navigation now prefers admin-managed navigation records with safe defaults.
- `/page/:slug` is the generic no-code page runtime.
- Remaining page-specific literals are preserved as intentional safe defaults and should be promoted into `site_content_registry` when business users need to edit them.
- External provider secrets remain deployment-only; provider metadata and feature flags belong in the admin control plane.
