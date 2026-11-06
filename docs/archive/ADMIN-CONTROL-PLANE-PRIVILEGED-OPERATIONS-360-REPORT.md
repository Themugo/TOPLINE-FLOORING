# TOPLINE FLOORING — Admin Control-Plane & Privileged Operations 360

## Result
Implemented and deployed migration `20260914110200_admin_control_plane_privileged_operations_360.sql`.

## Security changes
- Pinned `private.audit_log_change()` to an empty `search_path` while preserving qualified writes to the audit log.
- Pinned `private.current_user_has_role()` to an empty `search_path`.
- Pinned `private.bootstrap_owner()` to an empty `search_path` and retained its one-time service-role-only gate.
- Changed the sensitive operational export to require the dedicated `system.read` permission. A role that merely has `customers.read` can no longer invoke the cross-domain operational export.
- Retained authenticated RPC execution for the export while explicitly denying anonymous/PUBLIC execution.

## Live verification
The production Supabase project was checked after migration deployment. The hardened private functions report `search_path=""`; the operational export remains anonymous-denied/authenticated-allowed and its function body now requires `system.read`.

## Scope note
Customer-facing security-definer RPCs were not tightened merely because they are callable by authenticated users; their purpose is customer/public self-service and they remain outside the Admin control-plane boundary. Further changes to those RPCs require endpoint-by-endpoint ownership and data-flow review.

## Remaining external gate
Run the full Windows toolchain (`verify:all`, typecheck, lint and build) and execute role-based production UAT before release.
