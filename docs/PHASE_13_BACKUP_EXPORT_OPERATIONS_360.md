# Phase 13 — Backup & Export Operations 360

Phase 13 replaces the previous browser-facing export implementation with a controlled staff-authorized export boundary. Supabase remains responsible for PostgreSQL backups; Topline records each operational export request, returns an explicit allowlisted dataset, records row counts and a SHA-256 integrity digest, and exposes the result through the existing admin backup surface.

## Security boundary
- Staff authorization is enforced server-side by `private.require_staff_permission('system', 'read')`.
- The Edge Function accepts POST only and delegates data selection to `create_operational_data_export()`.
- The RPC is SECURITY DEFINER with a fixed search path and explicit dataset columns.
- Export-event history is readable only by authenticated staff with `system.read`; customer-read permission alone is insufficient.
- Anonymous and PUBLIC execution are revoked from the privileged export RPC.
- The export digest is SHA-256 over the canonical JSONB `payload.tables` value. Per-export metadata (`export_id` and `exported_at`) is deliberately excluded, so identical table snapshots produce the same digest.
- The dataset is ordered by creation time and primary key to keep row ordering stable for identical snapshots.
- No browser-side table enumeration is used for the export.

## Recovery reality
This phase does not claim that an application-level JSON export is a replacement for managed PostgreSQL backups. It is an operational handoff/recovery artifact. Supabase-managed backup/PITR retention, restore testing and recovery-point objectives must be verified in the Supabase project.

## Verification
Run `node scripts/verify-phase-13-backup-export-360.mjs` and `node scripts/verify-phase-12-14.mjs`.

The source verifier checks the effective follow-up migration, SHA-256 hash scope, permission boundary, Edge Function method/RPC contract, admin integration and migration-version uniqueness. A live PostgreSQL replay and role-based RLS test are still required before production use.
