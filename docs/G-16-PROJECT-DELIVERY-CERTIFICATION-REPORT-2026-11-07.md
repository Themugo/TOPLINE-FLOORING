# G-16 — Project delivery certification report

**Foundation:** `TOPLINE-FLOORING-G-15-LEADS-CRM-CERTIFICATION-2026-11-07.zip`  
**Scope:** quotation/order-to-project continuity, project delivery planning, field execution, tasks, materials, issues, quality inspections, project costs, customer sign-off, document vault and handover.

## Audit findings and repair
The existing Project Delivery 360 page calculated its "Ready to close" KPI using only `progress_percentage === 100`, even though the selected-project closeout decision also required zero open issues, zero unfinished tasks, completed latest installation, passed/waived latest quality inspection and approved customer sign-off. This made the KPI overstate the number of projects actually ready for closure.

The page also toasted load errors but did not retain an inline error state or provide an explicit retry control.

Repairs in `src/pages/admin/project-delivery-360.tsx`:
- Centralized the complete closeout predicate in `isReadyToClose`.
- Reused that predicate for both the page's closeout decision and the summary KPI, so the KPI no longer counts progress-only projects as ready.
- Added persistent load-error display and a retry action.
- Preserved existing RPCs, routes, migrations and UI structure. No new migration or duplicate data model was added.

## Verification
- G-16 focused source verifier: 13/13 expected.
- Existing Operation 2 Project Delivery verifier: passed.
- Existing project documents verifier: passed.
- Existing Phase 16 quotation/order/project verifier: passed.
- Existing Phase 17 site visit verifier: passed.
- Existing Phase 19 order confirmation/delivery verifier: passed.

An attempted `verify:project-document-vault` npm command was not registered in package.json; the canonical registered `verify:project-documents` verifier was run and passed. No claim is made for the unregistered command.

## Remaining staging acceptance
G-16 remains **OPEN** until staging evidence demonstrates:
1. Accepted quotation converts to one linked order and project.
2. Authorized staff can schedule and complete site visits and record measurements.
3. Task ownership, progress, materials, stock movement and issue resolution persist correctly.
4. Quality inspection blocks closeout when failed/pending.
5. Closeout is blocked until all operational criteria and customer sign-off are satisfied.
6. Project documents upload/download/delete work through private storage and staff RLS.
7. Customer handover and project status are visible only to authorized identities.
8. Browser acceptance covers desktop and mobile, with real staging roles and data.

No staging database, private storage or provider credentials were available. No live migration push, production data modification, deployment, Git commit or push was performed.

## Windows CMD
```cmd
npm ci
npm run verify:g16-project-delivery
npm run test:g16-project-delivery
```
Collect sanitized staging evidence separately; do not paste credentials or customer documents into chat.
