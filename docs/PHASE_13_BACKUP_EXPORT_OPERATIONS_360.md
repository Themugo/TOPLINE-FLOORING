# Phase 13 — Backup & Export Operations 360

Phase 13 replaces the previous browser-facing export implementation with a controlled staff-authorized export boundary. Supabase remains responsible for PostgreSQL backups; Topline records each operational export request, returns an explicit allowlisted dataset, records row counts and a deterministic payload hash, and exposes the result through the existing admin backup surface.

## Security boundary
- Staff authorization is enforced server-side by `private.current_user_has_permission`.
- The Edge Function accepts POST only and delegates data selection to `create_operational_data_export()`.
- The RPC is SECURITY DEFINER with an explicit search path and explicit dataset columns.
- Export events are audit records; they do not represent PostgreSQL backup completion.
- No browser-side table enumeration is used for the export.

## Recovery reality
This phase does not claim that an application-level JSON export is a replacement for managed PostgreSQL backups. It is an operational handoff/recovery artifact.

## Verification
Run `node scripts/verify-phase-13-backup-export-360.mjs`.
