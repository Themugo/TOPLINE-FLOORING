# TOPLINE FLOORING — Phases 12–14

## Phase 12 — Customer Portal
Supabase Auth magic-link access is now the customer identity boundary. A matching customer record is linked to the Auth user through `customer_portal_access`. Portal data is returned by a SECURITY DEFINER function and customer-facing RLS policies prevent cross-customer access.

## Phase 13 — Backup Reality & Data Export
The admin backup screen no longer simulates a backup. Supabase remains responsible for PostgreSQL backups. Topline provides a staff-authenticated operational JSON export for controlled data recovery/handoff workflows.

## Phase 14 — CI / Launch Quality Gate
GitHub Actions now runs `npm ci`, ESLint, TypeScript validation and the production Vite build on pushes and pull requests targeting `main`.

## Validation note
The workflow is designed for GitHub-hosted execution. Local dependency installation was not assumed during implementation, and no remote Supabase migration was applied by this phase.
