# Topline Supabase migration policy

Topline Flooring is a single-business application with its own dedicated Supabase project. It must never reuse the CALQULUS-PMS Supabase project.

## Migration-chain rule

The repository contains historical migrations from the original prototype. They are **frozen history** and must not be renumbered, deleted, or rewritten after a remote Topline project has been connected.

The repository is now pinned to the dedicated client-owned Topline project (`cvjmfplhdlfvqnnmzqcp`). This source-level pin does not prove that the linked remote migration history has been inspected or reconciled. The first and every subsequent remote deployment must follow the read-only history/dry-run/lint gate and separate owner authorization.

From this phase onward:

1. New migrations use a unique UTC timestamp and descriptive name.
2. No numeric migration prefixes such as `001`, `002`, `006`, etc. are reused.
3. All new migrations are tested against a clean local database before deployment.
4. Remote schema changes must go through versioned migrations; do not edit the production database manually.
5. Before any `db push`, inspect the dedicated Topline project's actual migration history, review the linked dry-run and lint results, and obtain explicit release approval.
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
