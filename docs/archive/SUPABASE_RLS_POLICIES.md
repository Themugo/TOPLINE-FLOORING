# Topline Supabase Security Model

This file describes the **current target security model** for the dedicated Topline Supabase project.

## Authentication

- Supabase Auth email/password is the identity layer.
- Browser clients use only the public/publishable Supabase key.
- The Supabase service-role/secret key is never shipped to the browser.
- There are no application passwords stored in database tables.
- Authorization is not derived from `auth.jwt()->user_metadata`.

## Staff authorization

Staff membership and RBAC are stored in:

- `staff_profiles`
- `staff_roles`
- `staff_permissions`
- `staff_role_permissions`
- `staff_role_assignments`
- `staff_invitations`

RLS policies call private, fixed-search-path authorization helpers in the `private` schema.

The browser may use `get_current_staff_profile()` for navigation and UX, but database RLS remains authoritative.

## Public vs protected data

### Public read

The public site can read published catalogue/content records such as products, categories, services, projects, homepage content and approved reviews.

### Staff-only

Customer, order, quotation, CRM, finance, inventory, procurement, warehouse, media-management and audit data are not exposed to anonymous clients.

### Customer submissions

Public transactional workflows should use controlled RPCs rather than direct anonymous writes into business tables. Server-side validation and pricing remain authoritative.

## Audit logging

`activity_logs` is append-only from the application's perspective.

Mutation triggers write audit records through `private.audit_log_change()`, recording:

- action
- entity type
- entity ID
- old/new details
- actor user ID
- actor email
- timestamp

The audit trigger function is not exposed as a public RPC.

## Data API grants

Supabase's current Data API behavior requires explicit grants for newly created public-schema tables in new projects. Phase 3 therefore treats grants and RLS as two separate controls:

1. GRANT determines whether a role can reach a table.
2. RLS determines which rows/actions that role can perform.

## Dedicated-project rule

The Topline application must never use the CALQULUS-PMS Supabase project. The project URL and public key must come only from the dedicated Topline deployment environment.
