# Phases 39–41 — Security, Delivery & Health

## Phase 39 — Admin mutation security
High-impact catalogue and inventory writes are moved behind SECURITY DEFINER RPCs with staff RBAC. Product deletion is an archive operation rather than a physical delete. Inventory alert resolution is transactional.

## Phase 40 — Communication outbox delivery
The outbound queue now has attempt tracking, retry timing, stale-lock recovery, provider completion, failure/retry and cancellation operations. `queued` is never presented as `sent`.

## Phase 41 — System health
A read-only `get_system_health_snapshot()` RPC and `/admin/system-health` page expose database response time context and key operational counts without mutating business data.

## Validation
Run `npm run verify:phases-39-41` for static contract verification. Run the existing local Supabase validation workflow before applying migrations to the real Topline project.
