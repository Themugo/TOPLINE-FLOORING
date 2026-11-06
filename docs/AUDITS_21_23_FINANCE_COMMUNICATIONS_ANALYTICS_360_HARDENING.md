# Phases 21–23 — Finance, Communications & Analytics 360 Hardening

## Purpose
Complete the finance, customer-communications and reporting layer after provider wiring by eliminating remaining browser mutation paths and converging operational reporting on protected server-side reads.

## Delivered
- Invoice item removal is transactional and permission-gated.
- Draft invoice deletion is transactional and restricted to draft invoices.
- Direct authenticated INSERT/UPDATE/DELETE access is revoked for invoices, invoice items, payments and customer communications.
- Legacy invoice status RPC execution is revoked so lifecycle transitions remain on the canonical hardened lifecycle RPC.
- Existing transactional finance RPCs are explicitly restricted to authenticated callers and staff permission checks remain server-side.
- Added a protected 360 analytics RPC covering finance, commerce, communications and website activity.
- Invoice mutation hooks now use RPCs instead of direct table deletes.
- CI includes a dedicated static verifier for the initiative.

## Operational boundary
The analytics RPC is read-only and staff-authorized. It does not expose customer-sensitive rows directly; it returns aggregate operational metrics and bounded top-page data.

Production application of the migration and dependency-aware frontend validation remain deployment-environment steps.
