# Operation 13 — Identity & Privileged Access 360

## Objective
Create a controlled business-authorization layer around Topline staff identity, staff activation, role changes and elevated-access approvals.

## Flow
**Identity → Staff membership → Role request → Approval → Role assignment → Lifecycle change → Evidence → Review**

## Controls
- `staff_identity_events` records onboarding, activation/deactivation and role changes.
- `privileged_access_requests` records explicit elevated-access requests and decisions.
- Staff status changes require a reason and are performed through an authorized RPC.
- Role grants/revocations require an authorized RPC and a reason.
- The last active owner cannot be deactivated or have the owner role revoked.
- Direct authenticated mutation of staff role assignments, profiles and invitations is revoked by the operation migration.
- Existing `private.require_staff_permission('staff', ...)` remains the authorization authority.
- Authentication remains Supabase Auth. This operation does not claim to configure MFA or provider session policy.

## Production boundary
MFA, session lifetime, password/recovery configuration, identity-provider settings and actual user provisioning remain external/Supabase Auth controls and must be verified in the production project.
