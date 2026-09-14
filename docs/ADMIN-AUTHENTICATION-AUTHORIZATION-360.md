# Admin Authentication & Authorization 360

## Status

**Implemented and structurally verified.** Live Supabase authorization helpers and Admin permission boundary were updated on the dedicated TOPLINE project.

## Authentication boundary

1. Browser Admin route checks the live Supabase Auth identity with `supabase.auth.getUser()`.
2. The authenticated identity must resolve to an active `staff_profiles` row.
3. The active staff profile is retrieved through `get_current_staff_profile()`.
4. Effective permissions are retrieved through `get_current_staff_permissions()`.
5. Route entry is allowed only when the requested Admin surface has the required server-derived permission.
6. PostgreSQL RLS and server-side RPC authorization remain the final authority for data and mutations.

## Authorization boundary

- `private.current_user_is_staff()` now uses a fixed empty search path.
- `private.current_user_has_permission()` now uses a fixed empty search path.
- `private.require_staff_permission()` now uses a fixed empty search path.
- `public.get_current_staff_profile()` now uses a fixed empty search path.
- `public.get_current_staff_permissions()` is SECURITY DEFINER with a fixed empty search path, restricted to `authenticated`, and denied to `anon`/PUBLIC.
- The `system.select` permission was explicitly added for `owner` and `admin` roles for system health, continuity, automation and backup Admin surfaces.

## Session lifecycle

- Admin inactivity timeout is centralized in `AdminAuthGuard` rather than the login page.
- Timeout is 30 minutes of inactivity.
- Activity resets the timer across mouse, keyboard, scroll and touch events.
- Timeout signs out through Supabase Auth and returns to `/admin/login`.
- Auth-state callbacks defer the asynchronous revalidation to avoid making Supabase calls directly inside the auth-state callback.

## Least-privilege UI

The Admin router remains protected by `AdminAuthGuard`, while the guard now maps Admin surfaces to server-derived permissions. An explicit `Access restricted` screen is shown when an active staff user lacks the required permission.

## Verification

- Admin Authentication & Authorization 360 static verification: **16/16 passed**.
- Migration deployment static verification: **82 active migrations passed**.
- DB-9–DB-11 verification: passed.
- Live permission boundary: `system.select` exists for `admin` and `owner` only.
- Live staff profile/permission RPC grants: authenticated only; anon/PUBLIC denied.
- Live SECURITY DEFINER authorization helpers: fixed `search_path = ''`.

## Remaining external gate

A real staff account must complete browser UAT for successful sign-in, correct role-based visibility, denied-module behavior, logout, password reset, session timeout and production Auth URL configuration. Credentials are not stored in the repository.
