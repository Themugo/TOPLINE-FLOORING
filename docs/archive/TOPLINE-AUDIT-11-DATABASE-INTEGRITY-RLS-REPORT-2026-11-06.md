# Phase 11 — Database Integrity and RLS Report

**Date:** 2026-11-06  
**Foundation:** Validated Phase 10 source tree  
**Status:** Source repair complete; staging database replay and live security certification remain outstanding.

## Audit scope

The audit traced the 157-migration chain, table constraints and foreign keys, RLS enablement and policy replacement, public read projections, anonymous intake surfaces, customer portal boundaries, staff RBAC policies, service-role-only tables and RPCs, private and public Storage buckets, project/customer document namespaces, audit triggers, migration ordering, and static database/security regression checks.

## Controls confirmed

- The canonical schema carries primary keys, unique identifiers, numeric/status checks and foreign-key relationships for commerce, finance, inventory, projects, fulfilment, communications and staff control-plane records.
- Public catalogue and portfolio access is separated from staff-only operational data; the public project view omits internal/customer and cost fields.
- Anonymous writes are limited to intentional intake/RPC surfaces; customer, order, finance, staff, automation and provider-event tables are not anonymous read/write surfaces.
- Sensitive control tables use deny-by-default direct-client policies and service-role or permission-gated RPC boundaries.
- Customer portal records are bound to the current authenticated customer; staff access is permission-gated.
- Private documents use a private bucket, path namespaces and separate project/customer policy families. Project documents require project permission and do not fall through to media/customer policies.
- Audit triggers and migration/runtime safety checks remain intact.

## Finding and repair

### P11-01 — Private customer-document updates did not constrain the destination path

The existing private-document update policy checked the source object in `USING`, but its `WITH CHECK` clause validated only the `private-documents` bucket. A customer with update access to their own object could therefore attempt to rename or move that object into another customer’s non-project path.

The Phase 11 migration replaces that policy so both the source and destination must remain outside `projects/`, and a customer update must continue to resolve to the same authenticated customer namespace. Staff with `media.update` retain their existing operational ability to update non-project private media. Project document policies remain separate and unchanged.

## Validation results

- Phase 11 database-integrity/RLS verifier: **PASS**
- Phase 10 worker/scheduler verifier: **PASS**
- Phase 9 admin permissions/operational actions verifier: **PASS**
- Database read-boundary and public-surface checks: **PASS**
- Application security trust-boundary checks: **PASS**
- Deep storage hardening checks: **PASS**
- Migration integrity and SQL runtime safety: **PASS**
- Workflow register JSON parse: **PASS**

The source migration count is now **158**, with `20261106220000_audit11_database_integrity_rls.sql` as the latest migration.

## Required staging / production gates

- Replay all 158 migrations on a disposable staging database and inspect `pg_constraint`, `pg_policies`, enabled RLS flags, grants, Storage policies and function privileges as the deployed role sees them.
- Run anonymous, customer, staff-permission, unauthorised-staff and service-role tests across public catalogue, portfolio, portal, documents, storage, finance, orders, automation and provider-event surfaces.
- Specifically test customer upload/update attempts that rename an object into another customer’s path, `projects/`, an invalid bucket and a traversal-like path; verify all are rejected.
- Run constraint/concurrency tests for order/payment/inventory/fulfilment records and replay all migration validation steps against a clean database.
- Complete backup/restore, staging browser/mobile, provider and production certification gates before release.

No commit, push, deployment, live provider call or production data change was performed.
