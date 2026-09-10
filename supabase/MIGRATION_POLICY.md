# Topline Supabase migration policy

Topline Flooring is a single-business application with its own dedicated Supabase project. It must never reuse the CALQULUS-PMS Supabase project.

## Migration-chain rule

The repository contains historical migrations from the original prototype. They are **frozen history** and must not be renumbered, deleted, or rewritten after a remote Topline project has been connected.

Because the current repository does not yet point at a live Topline Supabase project, Phase 3 establishes the canonical forward architecture without pretending that an unverified remote migration history has been reconciled.

From this phase onward:

1. New migrations use a unique UTC timestamp and descriptive name.
2. No numeric migration prefixes such as `001`, `002`, `006`, etc. are reused.
3. All new migrations are tested against a clean local database before deployment.
4. Remote schema changes must go through versioned migrations; do not edit the production database manually.
5. Once the dedicated Topline project exists, its actual migration history must be inspected before the first `db push`.
6. If the remote project is empty, the historical prototype chain can be formally squashed into a clean baseline in a dedicated migration-cleanup change. That squash must be tested with `supabase db reset` before deployment.
7. If the remote project contains any data, do not squash or rewrite history; reconcile the remote migration history first.

## Phase 3 canonical foundation

`20260910100000_033_staff_rbac_audit_foundation.sql` is the first canonical security/infrastructure migration after the historical prototype chain. It establishes:

- Supabase Auth as the identity layer
- staff membership
- roles and permissions
- role assignments
- staff invitations
- database-enforced RBAC
- explicit Data API grants
- RLS on exposed business tables
- append-only audit logging with actor attribution

Authorization is based on database role/permission tables, never on user-editable `user_metadata`.
