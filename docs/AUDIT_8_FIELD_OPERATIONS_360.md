# Phase 8 — Field Operations 360

This initiative closes the field-execution loop around the existing canonical installation, project and site-visit records.

## Scope
- Site evidence and normalized installation measurements
- Installation crew assignment using the existing workforce boundary
- Material allocation against active catalogue products
- Installation progress history and project progress synchronization
- Field issue reporting and resolution
- Completion gate and installation sign-off
- Unified admin Field Operations 360 workspace

## Design rules
- `installations`, `projects`, `site_visits`, `products` and `installation_assignments` remain canonical records.
- New tables store field execution history rather than duplicating canonical entities.
- Mutations are performed through SECURITY DEFINER RPCs with the existing staff RBAC permission helpers.
- Direct anonymous writes are not permitted for the new field records.
- Installation sign-off is blocked while open/in-progress installation issues remain.
- Completing the final installation for a project synchronizes project completion.

## Verification
Run:

```cmd
npm run verify:phase-8-field-operations
```

Then replay the migrations through an authorized Supabase CLI session before production deployment.
