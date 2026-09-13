# Topline Flooring — Full Migration Deployment Audit 360

Date: 2026-09-13

## Scope

All 59 active Supabase migrations were audited, with a focused clean-sweep review of the pending production wave 072–088 against the canonical schema and RBAC model already deployed through 071 on the client-owned project.

## Defects identified and corrected

1. **072 — Maintenance Retention**
   - `maintenance_plan_visits.assigned_to` referenced `public.staff_profiles(id)`.
   - Canonical `staff_profiles` primary key is `user_id`.
   - Corrected the foreign key and active-staff lookup to `staff_profiles(user_id)`.

2. **073 — Customer Renewal**
   - PL/pgSQL renewal loop variable was reviewed and confirmed declared (`r record`).
   - No deployment blocker found.

3. **074 — Commercial Lifecycle**
   - Reviewed table dependencies, canonical lead/quotation/order/project columns, and PL/pgSQL variables.
   - No deployment blocker found.

4. **075 — Project Delivery**
   - Reviewed installation/project dependencies and loop variables.
   - No deployment blocker found.

5. **076 — Supply Chain**
   - Corrected non-canonical RBAC action `read` to `select` in policy/function calls.
   - Canonical staff permission actions are `select/insert/update/delete/manage`.

6. **077 — Finance Control**
   - Corrected non-canonical RBAC action `read` to `select`.

7. **078 — Fulfillment & Delivery**
   - Reviewed `staff_profiles(user_id)` driver relationship; confirmed it is already canonical.
   - No deployment blocker found.

8. **079 — Customer Lifecycle**
   - Previously corrected missing PL/pgSQL loop declaration (`r record`).
   - Confirmed `service_cases.escalation_level` exists from migration 070.

9. **080 — Communications Customer Journey**
   - Corrected non-canonical RBAC action `read` to `select`.
   - Confirmed `communication_outbox.delivery_status` exists from migration 060.

10. **081 — Executive Operations Control**
    - Corrected non-existent `projects.expected_completion_date` reference to canonical `projects.end_date`.
    - Corrected non-canonical RBAC action `read` to `select`.

11. **082 — Reliability / Incident Response**
    - Reviewed incident schema, row-level security, RPC signatures, and report permission usage.
    - No deployment blocker found.

12. **083 — Business Continuity / DR**
    - Reviewed table constraints, RPC signatures, and dependencies.
    - No deployment blocker found.

13. **084 — Data Governance / Privacy**
    - Reviewed table dependencies and RPC structure.
    - No deployment blocker found.

14. **085 — Identity / Privileged Access**
    - Corrected renewal-style role-code alias issue where request alias `r` could be confused with `staff_roles` alias `sr`; role code is sourced from `sr.code`.
    - Reviewed staff identity relationships against canonical `staff_profiles.user_id`.

15. **086 — Quality Assurance / Corrective Action**
    - Reviewed schema, dependencies, triggers and RPCs.
    - No deployment blocker found.

16. **087 — HSE / Site Compliance**
    - Reviewed schema, dependencies, triggers and RPCs.
    - No deployment blocker found.

17. **088 — Client-Owned Infrastructure Hardening**
    - Retained the production hardening that revokes execution of the historical `public.rls_auto_enable()` helper from PUBLIC/anon/authenticated.

## Prior defects retained as corrected

- 033: PL/pgSQL `p record` declarations and singleton `IN (...)` syntax.
- 048: undeclared `v_reserved` variable.
- 054: obsolete `private.has_staff_permission` replaced by canonical permission helper.
- 069: PostgreSQL aggregate `FILTER` cast ordering.
- 079: undeclared PL/pgSQL loop variable.

## Verification

Static deployment verification passes with exactly 59 active migrations:

`Migration deployment static verification PASSED (59 migrations)`

The static gate checks legacy permission helpers, invalid aggregate syntax, singleton `IN` commas, non-canonical RBAC `read` actions, invalid `staff_profiles(id)` references, the removed `projects.expected_completion_date` reference, undeclared PL/pgSQL variables/loop variables, migration count, and migration 088 presence.

## Important deployment note

Supabase CLI `db push --dry-run --linked` only determines which migration files are pending. It does **not** execute their PostgreSQL statements. Therefore a clean dry-run cannot prove SQL execution safety. The production deployment must be the final execution test after this clean-sweep package is installed.
