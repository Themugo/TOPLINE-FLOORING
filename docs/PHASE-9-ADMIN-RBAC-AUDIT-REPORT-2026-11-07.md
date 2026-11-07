# Phase 9 — Administration, Control Plane & RBAC Audit

Date: 2026-11-07  
Authoritative foundation: `TOPLINE-FLOORING-PHASE-08-COMPLETE-2026-11-07.zip`

## Scope

The active workflow register defines Phase 9 as WF-09 Administration/control plane/RBAC. This pass audited the existing AdminAuthGuard, explicit route-to-permission map, server-derived staff permissions, staff identity RPCs, privileged control-plane migration contracts and existing route coverage. It does not introduce a second authorization system.

## Repair

A protected admin path without an explicit `ROUTE_PERMISSIONS` entry could previously pass the guard after active-staff verification because the permission check was conditional on a permission being present. The guard now identifies protected `/admin` paths and denies access when no explicit route permission resolves. Existing route normalization and explicit permission checks remain intact.

## Preserved controls

- Supabase Auth identity is verified with `getUser`.
- An active staff profile is required.
- Effective permissions are loaded from the server-side `get_current_staff_permissions` RPC.
- All 69 currently registered admin routes retain explicit permission mappings.
- The 30-minute inactivity timeout and existing unauthorized screen remain.
- SECURITY DEFINER permission helpers retain fixed search paths and existing grants.
- Privileged export continues to require `system.read`; customer-read is not accepted as a substitute.
- No new migration was required; the existing database authorization boundary is retained.

## Changes

- `src/components/admin/AdminGuard.tsx` — fail-closed handling for unknown protected admin paths.
- `scripts/verify-admin-authentication-authorization-360.mjs` — added regression assertions for fail-closed route resolution.
- `scripts/verify-phase-9-admin-rbac-fail-closed.mjs` — new Phase 9 targeted verifier.
- `scripts/verify-admin-shell-and-pwa.mjs` — updated to assert the normalized route lookup contract.
- `scripts/verify-phase-7-customer-self-service-documents.mjs` and `scripts/verify-phase-8-communications-hardening.mjs` — updated historical continuity assertions to recognize the Phase 8 current foundation.
- `package.json`, `docs/MASTER-WORKFLOW-REGISTER.json`, and `.csv` — Phase 9 verifier and status recorded.

## Verification

- Phase 9 targeted verifier: 10/10.
- Admin authentication/authorization verifier: 19/19.
- Admin control-plane privileged operations verifier: 8/8.
- Migration integrity: passed; 155 unique active migration timestamps.
- SQL runtime safety static verifier: passed.
- Workflow register JSON parse: passed.
- New verifier JavaScript syntax check: passed.
- Aggregate `node scripts/verify-all.mjs`: 159/159 passed, 0 failed.
- ZIP integrity and source path preservation: checked during packaging.

## Not certified in this environment

Root `node_modules` is absent, so TypeScript, lint and Vite build were not run. No live Supabase role matrix, multi-session permission revocation test, browser session-expiry test, PostgreSQL migration replay or production deployment was performed. These remain staging/release gates. No production data was changed; no deployment, commit or push was performed.
