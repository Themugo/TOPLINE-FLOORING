# TOPLINE Unified Design-Token Specification

**Scope:** shared public/customer and admin/operations UI. This is a source-level token contract; rendered contrast and responsive certification must still be confirmed in a browser on the release checkout.

## Brand and surfaces

| Token / role | Default | Use |
|---|---|---|
| Brand primary | `#153F69` | Primary actions, links, active navigation, deep-blue hero treatment and focus ring |
| Brand gold | `#C9971F` | Restrained decorative accents; not used as small text on white |
| Strong gold text | `#855C16` | Section labels/eyebrows on light backgrounds; calculated from the governed gold hue |
| Warm page background | `#FAF6EE` | Page canvas and light neutral utility background |
| Surface | `#FFFFFF` | Cards, forms, panels and table surfaces |
| Muted text | `#64748B` | Secondary text, helper copy and metadata |
| Border | `#DBE3EC` | Shared surface/boundary default; existing semantic border utilities remain supported |

## Semantic status and charts

| Role | Foreground | Surface / default |
|---|---|---|
| Success | `#166534` | `#F0FDF4` |
| Warning | `#854D0E` | `#FFFBEB` |
| Danger | `#991B1B` | `#FEF2F2` |
| Information | `#075985` | `#F0F9FF` |
| Chart 1 | `#153F69` | Primary series |
| Chart 2 | `#C9971F` | Accent series; use with labels/markers, not small white-on-gold text |
| Chart 3 | `#2E86A7` | Supporting series |
| Chart 4 | `#64748B` | Neutral series |

## Runtime governance

- `src/lib/theme-engine.ts` normalizes hex colors, approved fonts, button shape, radius and spacing before applying runtime values.
- The selected primary/accent color is preserved at shade `500`; generated ramps support lighter/darker utility shades.
- Primary and supporting-accent ramps are both updated without overwriting one another.
- Primary/accent colors with insufficient contrast against white button text are rejected by the theme editor and fall back safely when loading an older persisted theme.
- Theme settings continue to use the existing governed Supabase RPCs, version history and rollback. No schema or migration was added.
- `site_design_tokens` are normalized into CSS custom property names and unsafe token values are not applied. Existing seeded tokens now feed the shared container width, section spacing, content gap, surface radius and surface shadow.
- Custom CSS is validated both at save time and at runtime. External URL/import/executable constructs, removal of focus outlines, hiding the application root, and oversized CSS payloads are rejected. This is defense-in-depth, not a replacement for authorization of the site-control feature.

## Shared layout rules

- Public pages retain conversion-oriented layouts; admin pages retain dense tables and operational controls.
- `.page-container`, `.page-section`, `.page-hero-inner`, `.surface`, `.table-shell` and `.customer-intent-grid` consume the existing site design tokens.
- Tailwind `gray-*` utilities are centralized onto warm-neutral backgrounds and slate text to unify legacy screens without page-by-page global find-and-replace.
- Status green/yellow/red/blue utilities remain semantically separate from the TOPLINE brand palette.
- Keyboard focus visibility and reduced-motion behavior remain global defaults.

## Contrast checks performed in the static verifier

All 10 tested default pairs passed WCAG AA 4.5:1 for normal text:

- `#153F69` on white and warm background.
- `#64748B` on white.
- `#855C16` fallback and generated `#916D16` gold-accent text on white.
- Success, warning, danger and information foregrounds on their semantic surfaces.
- Supporting accent `#0369A1` on white.

The gold accent `#C9971F` itself is not approved as small text on white; the darker `#855C16` token is used for text labels.
