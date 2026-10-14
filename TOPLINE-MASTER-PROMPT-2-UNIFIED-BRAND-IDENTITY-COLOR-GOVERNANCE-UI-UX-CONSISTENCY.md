# TOPLINE MASTER PROMPT 2 — UNIFIED BRAND IDENTITY, COLOR GOVERNANCE AND COMPLETE UI/UX CONSISTENCY SWEEP

## Project baseline

Continue the existing TOPLINE FLOORING & WATERPROOFING codebase from the supplied ZIP. Preserve the existing application, routes, business logic, database, Supabase integration, permissions and all working features.

This is a controlled design-system unification, not a redesign from scratch.

## Objective

Make the entire system visually recognizable as one professional TOPLINE product, from the homepage's first section to the final admin page, from the first card to the last form field, table row, dialog, badge, toast and footer.

The system has two visual operations:

1. Public website and customer portal: premium, clear, welcoming, conversion-oriented and trustworthy.
2. Admin and operational control plane: professional, efficient, information-dense, readable and optimized for desktop work, while remaining usable on tablets and phones.

They must share one governed design system while retaining the appropriate layout and information density for each audience.

## Phase 1 — Audit before editing

Inspect all public pages, customer-facing pages, admin pages, shared layouts, UI primitives, CSS files, Tailwind configuration, theme settings, ThemeApplier, theme-engine, design tokens, custom CSS handling, charts and third-party component styles.

Create a complete route/component inventory. Identify duplicated styling systems, inconsistent colors, hard-coded values, conflicting CSS variables, inconsistent typography, spacing, radii, shadows, buttons, cards, inputs, tables, icons, responsive rules and interaction states.

Record the original design and identify exactly where each inconsistency occurs. Do not make sweeping replacements before understanding the existing styling contracts.

## Phase 2 — Define one authoritative design system

Retain and consolidate the existing TOPLINE identity around deep blue, restrained gold, warm neutrals and white surfaces.

Use these existing colors as the starting point, subject to contrast validation:

- Deep blue: #153F69
- Primary gold: #C9971F
- Warm-neutral background: #FAF6EE
- White surfaces: #FFFFFF
- Neutral secondary text: #64748B

Define semantic tokens for:

- Brand primary, hover, active and focus states.
- Brand accent and restrained highlights.
- Page backgrounds, cards, panels and elevated surfaces.
- Primary, secondary and muted text.
- Borders, separators and disabled states.
- Links, selection and keyboard focus.
- Success, warning, danger and information.
- Form validation, loading and empty states.
- Charts and data visualization.

Validate text/background contrast and interactive-state visibility. Do not use brand colors as a substitute for semantic status colors.

Avoid introducing a new unrelated palette. Do not make every surface gold or navy. Preserve sufficient whitespace and use visual hierarchy instead of excessive decoration.

## Phase 3 — Consolidate the styling infrastructure

Make Tailwind configuration, CSS variables, semantic component classes and runtime theme settings agree on the same token definitions.

Remove accidental duplication and contradictory definitions. Replace hard-coded colors only after identifying their intended semantic role.

Audit the precedence of defaults, administrator-managed theme settings, site design tokens and custom CSS. Ensure updates cannot silently produce inconsistent components or break layouts.

Validate theme input and prevent custom styling from compromising application readability, focus visibility or layout integrity. Preserve existing site-control capabilities where safe.

Create and use shared primitives for buttons, cards, page headings, section labels, badges, inputs, tables, dialogs, toasts, empty states, loading states and status indicators.

Do not introduce a second theme engine or duplicate the same design tokens across individual pages.

## Phase 4 — Unify Operation 1: Public website and customer experience

Apply the shared system consistently to the homepage, navigation, footer, services, product listings, product details, comparisons, cart, checkout, quotation forms, contact, portal, tracking, payment return and confirmation pages.

Standardize typography, hero sections, page widths, spacing, image ratios, card treatments, section transitions, button hierarchy, form controls, validation messages and mobile behavior.

Preserve actual content, product information, pricing, payment logic, quotation behavior, routes and customer workflows. Do not fabricate warranties, product specifications, features, ratings or other business claims.

Make the customer journey visually consistent and accessible without turning every page into the same template.

## Phase 5 — Unify Operation 2: Admin and operational control plane

Apply the same brand tokens to every admin route, including dashboards, catalogue management, orders, quotations, CRM, projects, inventory, procurement, deliveries, finance, communications, reporting, identity/access, backups and system-health tools.

Standardize:

- Admin navigation, sidebar, top bar, breadcrumbs and page titles.
- Dashboard layouts, statistic cards, charts and data panels.
- Tables, filters, pagination, sorting and bulk actions.
- Forms, field labels, validation, dialogs and confirmations.
- Status badges, notifications, audit information and empty/error states.
- Button hierarchy, icon sizing, borders, radii and shadows.

Do not turn operational tables into decorative cards when tabular density is appropriate. Do not impose a mobile-sized layout on desktop. Keep wide-screen dashboards and administrative workflows genuinely usable on desktop, with deliberate tablet and mobile adaptations.

Preserve every existing permission, action, workflow and module.

## Phase 6 — Audit every visual state

Check normal, hover, focus, active, selected, disabled, loading, empty, success, warning, error and permission-denied states.

Check long text, missing images, broken images, oversized tables, narrow viewports, modal overflow, dropdown clipping, keyboard navigation and reduced-motion preferences.

Verify that dark hero sections use readable light text and that light surfaces do not accidentally inherit low-contrast text. Check the actual rendered UI rather than relying only on class-name searches.

## Phase 7 — Verify completeness and prevent regression

Build a route-by-route visual audit matrix for the public site, customer portal and every admin route.

Use available render/smoke tests and interaction tests. Add regression tests or automated assertions where appropriate. Run typecheck, lint, build and existing verification scripts after changes.

Do not remove or weaken existing tests to make the redesign pass. Confirm that theme updates, content management, forms, checkout, payment return, tables, permissions and responsive navigation still work.

## Non-negotiable constraints

- Do not rebuild the frontend or replace the current architecture.
- Do not add or remove business features.
- Do not change database schemas, payment logic, authorization or provider integrations for visual convenience.
- Do not delete working components simply because their appearance differs.
- Do not make speculative global find-and-replace changes to color classes.
- Do not hard-code a new theme independently into each page.
- Do not commit or push unless explicitly instructed.
- Do not report a route as visually verified unless it was actually inspected or tested.

## Completion criteria

Deliver:

1. The unified design-token specification.
2. The consolidated shared styling implementation.
3. The public-site consistency sweep.
4. The admin-system consistency sweep.
5. A complete route-by-route audit matrix.
6. Responsive, accessibility and contrast findings.
7. Regression-test, typecheck, lint and build results.
8. A list of any routes or states that remain unverified.

Work through every page and shared component, not only the homepage and dashboard. Fix confirmed inconsistencies in the code, verify them, and continue until every route is either checked or explicitly documented as blocked.

The final result must be one recognizable TOPLINE system across both operations, with audience-appropriate layouts, consistent branding and no unfinished sections left unreported.
