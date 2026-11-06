# Phase 9 — Admin Permissions and Operational Actions Report

**Date:** 2026-11-06  
**Foundation:** Validated Phase 8 source tree  
**Status:** Source repair complete; dependency, staging, browser and production gates remain outstanding.

## Audit scope

The review traced staff authentication and route protection, server-derived permission resolution, owner/admin hierarchy safeguards, privileged RPC grants, direct admin mutations protected by RLS, order and delivery state changes, fulfilment readiness, assignment, dispatch, exception recovery, audit/event records, background-worker boundaries, and the desktop/mobile admin surfaces.

## Existing controls confirmed

- `AdminAuthGuard` requires an authenticated user, an active staff profile and the server-derived permission set; route permissions are normalized and unauthorized routes render a forbidden state.
- `private.require_staff_permission()` is the shared database authorization boundary, with `manage` satisfying resource actions and `read` normalized to `select`.
- Owner identity and owner role assignment are protected by database triggers. Self-deactivation/self-revocation is blocked, elevated role changes are owner-controlled, and identity actions require reasoned audit events.
- Privileged operational RPCs are authenticated-only and the fulfilment, finance and identity views read through permission-gated RPCs or RLS-protected tables.
- Delivery and fulfilment state changes retain `delivery_events`, `fulfillment_events` and the append-only activity log trail.

## Findings and repair

### P9-01 — Picking could advance an unpaid order

`mark_delivery_picked()` required only `orders.update` and allowed a pending/processing delivery to be marked picked without checking the parent order's payment status. The Phase 9 migration now locks the order with the delivery and requires `payment_status = 'paid'` before the state change.

### P9-02 — Terminal delivery states were not consistently terminal

Rescheduling excluded only delivered deliveries, and exception recording excluded only delivered deliveries. A cancelled delivery could therefore be moved back into operational processing. The repair rejects both delivered and cancelled deliveries for rescheduling and exception creation.

### P9-03 — Failed-delivery recovery could re-open a closed or unpaid order

Recovery previously checked only that the delivery was failed. The repair also locks the parent order and rejects recovery for cancelled/completed orders or unpaid orders.

### P9-04 — Dispatch trusted stale driver assignment

Dispatch checked that a driver ID existed but did not re-check that the associated staff profile was still active. The repair requires an active staff profile at dispatch time, in addition to the existing paid-order, address and state checks.

All repaired transitions preserve the existing RPC names, grants, event history, UI contract and folder/naming conventions. No mock data, duplicate flow, redesign or direct production write was introduced.

## Validation results

- Phase 9 operational-action verifier: **PASS**
- Admin authentication/authorization 360: **16/16 PASS**
- Admin control-plane privileged operations: **8/8 PASS**
- Admin feedback contract: **PASS**
- Admin shell/PWA: **34/34 PASS**
- Admin management uploads: **PASS**
- Admin list pagination/search: **11/11 PASS**
- Admin orders pagination: **3/3 PASS**
- RPC authorization certification: **PASS**
- Operation 9 production-certification structural gate: **PASS**; remote deployment and UAT remain manual
- Migration integrity and SQL runtime safety: **PASS**
- Workflow register JSON parse: **PASS**

The source migration count is now **156**, with `20261106200000_audit9_admin_permissions_operational_actions.sql` as the latest migration. Dependency installation/build/typecheck were not treated as source evidence where the extracted tree lacks installed packages.

## Required staging / production gates

- Replay all 156 migrations on a disposable staging database and verify the replaced RPC signatures/grants after replay.
- Run role-matrix tests for owner, admin, manager, operations, finance, sales and ordinary staff against each admin route and each operational RPC.
- Execute staging concurrency tests for simultaneous picking, dispatch, cancellation, driver deactivation, exception/recovery and payment settlement.
- Run desktop and mobile browser journeys for admin login, forbidden routes, staff management, fulfilment board, delivery detail, exception recovery and audit history.
- Verify live payment/provider callbacks, scheduler/worker execution, notification delivery and real operational records in staging.
- Production certification remains closed until staging replay, role-constrained UAT, provider tests, backup/restore evidence and release approval pass.

No commit, push, deployment, live provider call or production data change was performed.
