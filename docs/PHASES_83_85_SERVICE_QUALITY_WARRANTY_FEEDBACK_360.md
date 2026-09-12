# Phases 83–85 — Service Quality, Warranty Entitlement & Customer Feedback 360

## Objective
Extend the customer-service SLA foundation into a measurable after-sales quality loop without bypassing the canonical `service_cases` lifecycle.

## Phase 83 — SLA Escalation Reconciliation
- `reconcile_service_case_slas_360()` recalculates escalation levels from elapsed SLA time.
- Only open cases are eligible.
- Escalation changes are written to `service_case_events`.
- The operation is staff-authorized and server-side.

## Phase 84 — Warranty Entitlement Validation
- `refresh_service_case_warranty_360(uuid)` derives warranty coverage from canonical order items/products where warranty years are defined.
- Warranty start prefers project completion, then project date, order creation, and finally case report date.
- The case records `warranty_start`, `warranty_end`, and `warranty_valid`.
- Validation is audited through `service_case_events`.

## Phase 85 — Customer Satisfaction Loop
- `service_case_feedback` stores one customer rating per resolved/closed case.
- Ratings are 1–5 with normalized outcome labels.
- Customers can submit feedback only for their own resolved/closed cases.
- Staff can review feedback through `get_service_case_quality_360()`.
- Admin service operations expose average rating, low ratings, verified warranty cases, and escalated open cases.

## Security
- Feedback table has RLS enabled.
- Direct anonymous/authenticated INSERT/UPDATE/DELETE is revoked.
- Mutations occur through controlled SECURITY DEFINER RPCs.
- RPCs use `search_path=public,private` and explicit staff/customer authorization.

## Validation
Run:

```cmd
npm run verify:phases-83-85
npm run verify:migration-integrity
npm run verify:release-candidate
```

Full local database replay remains the authoritative next step when the local Supabase toolchain is available. No remote production migration is claimed by this package.
