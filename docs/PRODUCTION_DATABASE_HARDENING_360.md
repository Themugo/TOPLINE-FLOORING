# Production Database Security + RLS + RPC + Index Hardening 360

## Baseline
Applied on top of the successfully deployed 001–088 schema in the client-owned Supabase project. No business data migration or destructive table rewrite is included.

## Delivered
- **089:** removes anonymous EXECUTE from all `SECURITY DEFINER` functions, then restores an explicit five-function public allow-list for website checkout/quotation/coupon/order tracking flows.
- **090:** gives the 17 RLS-enabled/no-policy control and audit tables an explicit deny policy for `anon` and `authenticated`, preserving access through privileged RPC/service paths.
- **091:** removes implicit `PUBLIC` function execution while preserving the pre-existing authenticated execution set; hardens three function search paths.
- **092:** adds missing indexes for foreign-key columns using deterministic names.
- **093:** removes only redundant FK indexes created by 092 where a pre-existing equivalent application index exists, and optimizes two `auth.uid()` RLS predicates with init-plan evaluation.

## Safety / rollback
All migrations are transactional where PostgreSQL permits. Changes are privilege, policy, function-configuration, and index-only. Rollback is manual and evidence-driven; no blanket restoration of `PUBLIC` execution or broad permissive RLS policies is permitted.

## Live verification
After deployment, Supabase Security Advisor reports no remaining RLS-without-policy findings, no mutable-search-path findings, and the only anonymous SECURITY DEFINER warnings are the five explicitly public website RPCs. The remaining authenticated SECURITY DEFINER warnings are intentionally retained application RPCs and are the subject of a future function-by-function exposure classification rather than a blanket revoke that could break staff workflows.

Performance Advisor now has no missing-FK-index finding. Its remaining index notices are predominantly unused-index observations on a newly deployed/low-traffic system; these are deliberately not deleted without production query telemetry. Duplicate-index findings are limited to pre-existing duplicate structures not safely attributable to the hardening migration.
