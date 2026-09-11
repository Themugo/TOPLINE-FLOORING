# Topline Flooring — Premium All-Pages UI Initiative

This initiative establishes a shared premium visual system across all public, customer-portal and admin routes without changing business/data contracts.

## Scope
- Public website shell: glass/blur header, stronger navigation hierarchy, premium CTA treatment.
- Shared page primitives: hero, container, section, surface, stat, form, table and empty-state patterns.
- Admin shell: refined neutral workspace, translucent sticky header, stronger depth and focus hierarchy.
- Accessibility: preserves existing skip-link, keyboard focus and reduced-motion behavior.
- Responsive: mobile remains first-class; hover lift is disabled on touch-sized layouts.

## Route coverage
All current `src/pages/**/*.tsx` routes inherit the shared shell and design tokens. The project currently contains 61 routed page components.

## Verification
Static route/file verification confirms every route-imported page exists and the premium shared design primitives are present.

Production build and live Supabase validation remain separate infrastructure gates and are not claimed by this UI initiative.
