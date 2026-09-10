# Topline Supabase infrastructure

The active migration chain is intentionally small and canonical:

1. `20260910000000_topline_canonical_schema.sql` — normalized schema baseline.
2. `20260910090000_032_commerce_contract_hardening.sql` — Phase 2 transaction hardening.
3. `20260910100000_033_staff_rbac_audit_foundation.sql` — Phase 3 authentication/RBAC/RLS/audit foundation.
4. `20260910110000_topline_rpc_contracts.sql` — final RPC signatures reconciled to the canonical schema.

`migrations_legacy/` is forensic reference material and must not be deployed.

This project is intentionally independent of any CALQULUS-PMS Supabase project.
