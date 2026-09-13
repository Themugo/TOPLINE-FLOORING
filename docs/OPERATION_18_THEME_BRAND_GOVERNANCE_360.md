# Operation 18 — Theme & Brand Governance 360

## Purpose
Make the Topline theme system a governed production design system rather than a direct mutable settings row.

## Controls
- Theme publishing is permission-gated through the canonical `content/update` staff boundary.
- Every publish creates an immutable revision snapshot.
- Revision history is client-denied and readable only through the governance RPC.
- Rollback creates a new governed publish rather than mutating history.
- Theme colors, radius, spacing, button style and layout are validated server-side.
- Live design tokens are applied centrally by `ThemeApplier`.

## Migration
`20260913220000_102_theme_brand_governance_360.sql`

## Production deployment
Run the normal migration and application verification gates, then `npx supabase db push --linked`.
