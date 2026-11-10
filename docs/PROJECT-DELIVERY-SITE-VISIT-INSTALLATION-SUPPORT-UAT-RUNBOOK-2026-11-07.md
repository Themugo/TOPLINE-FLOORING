# Project Delivery, Site Visit, Installation & Support — Staging UAT Runbook

**Foundation:** G-13 lineage, continued from `TOPLINE-FLOORING-LEADS-CRM-LIVE-UAT-G13-2026-11-07.zip`.
**Purpose:** Execute authenticated staging acceptance for the post-sale lifecycle. This runbook is not evidence that staging or production tests have already run.

## Safety and setup

- Use a dedicated staging Supabase project and synthetic customer/order/project records only.
- Use separate staging identities for customer, project coordinator, installer, support agent and read-only staff. Verify each identity's actual grants before testing.
- Do not run destructive tests against production, real customer records, real payment providers or production storage.
- Capture UTC timestamps, sanitized request/correlation IDs, expected result, actual result and screenshots. Never capture access tokens, signatures or customer-sensitive documents.
- Confirm the staging database has replayed the repository's ordered migrations. Record project reference, migration head and app build SHA in the evidence template.

## Test cases

| ID | Scenario | Expected result / evidence |
|---|---|---|
| PD-01 | Convert a staging accepted quotation to order/project | One canonical order and linked project; quotation, customer and order relationships agree. |
| PD-02 | Open project delivery workspace with project coordinator | Project summary, progress, tasks, issues, installation, materials, quality and sign-off load from persisted records. |
| PD-03 | Update progress and reload | Progress persists; refresh does not revert or fabricate values. |
| PD-04 | Create task, assign active staff, mark complete | Task and ownership persist; completion is reflected after reload. |
| PD-05 | Create issue, resolve with notes | Issue remains in history and is excluded from open-issue count only after resolution. |
| PD-06 | Record measurement with units and notes | Measurement persists against the correct project and actor. |
| PD-07 | Allocate material with sufficient stock | Project allocation, warehouse/product stock decrement and inventory movement reconcile exactly once. |
| PD-08 | Allocate more than available stock | Operation fails closed; no partial allocation or stock movement remains. |
| PD-09 | Concurrently allocate the final available units to two projects | No negative stock; at most one allocation succeeds for the constrained quantity; ledger and stock reconcile. |
| SV-01 | Schedule site visit for a valid quotation | Visit links to the canonical customer/project; appointment and active assignee persist. |
| SV-02 | Schedule with past date or past same-day time | Server rejects; no visit row is created. |
| SV-03 | Attempt scheduling without project insert permission | Server denies even if the identity has unrelated quotation permissions. |
| SV-04 | Use quotation/customer/project IDs that do not agree | Server rejects mismatched relationships. |
| SV-05 | Complete a scheduled visit and reload | Status and lifecycle event persist; terminal visit cannot be reopened. |
| SV-06 | Cancel a scheduled visit and attempt completion | Cancellation persists; terminal transition is rejected. |
| IN-01 | Assign active staff to installation | Assignment and role persist; duplicate assignment updates the existing unique row rather than duplicating it. |
| IN-02 | Assign inactive or unknown staff | Server rejects; no assignment is created. |
| IN-03 | Start installation | Status becomes in progress; start timestamp and linked project state are consistent. |
| IN-04 | Complete installation and reload | Completion timestamp persists; completed installation cannot be reopened. |
| IN-05 | Two coordinators concurrently change installation status | Row locking serializes transitions; final state and audit evidence are consistent. |
| IN-06 | Installer without project update permission attempts status change | Server denies; no state change occurs. |
| QA-01 | Record failed quality inspection | Failed inspection blocks project closeout. |
| QA-02 | Record passed/waived inspection with open task or issue | Closeout remains blocked until tasks/issues are cleared. |
| QA-03 | Attempt closeout without customer sign-off | Server rejects; project remains open. |
| QA-04 | Complete all closeout criteria and record customer sign-off | Closeout succeeds once; KPI and project detail agree after reload. |
| SU-01 | Customer creates own support/warranty case | Case is created with unique case number and correct customer/project/order links. |
| SU-02 | Customer attempts to create case for another customer | Server denies; no case is created. |
| SU-03 | Staff transitions case open → review → scheduled → in progress → resolved → closed | Each transition persists with actor/time event; closed case cannot be reopened. |
| SU-04 | Validate warranty for a project-linked case | Entitlement dates and valid/invalid result derive from canonical order/product warranty and project completion dates. |
| SU-05 | Submit feedback before resolution or for another customer's case | Server rejects. |
| SU-06 | Submit 1–5 rating after resolution, then submit again | First submission succeeds; duplicate is rejected; quality metrics update once. |
| SU-07 | Verify role boundaries across project, installer, support and customer identities | Each identity sees only authorized records/actions; direct table writes cannot bypass controlled RPCs/RLS. |
| SU-08 | Force a read/network failure in each workspace | Failure is visible; retry recovers without duplicate writes. |
| SU-09 | Browser pass at 320, 375, 430, tablet and desktop widths | Forms, tables, actions and status information remain usable without horizontal page overflow. |

## Required evidence and pass criteria

- Record every test as PASS, FAIL, BLOCKED or NOT RUN; attach sanitized evidence for every PASS.
- For transactional tests, capture before/after row counts and relevant stock/case/project state. For concurrency tests, capture both request start/end times and resulting database state.
- Any negative authorization test that unexpectedly succeeds is a release blocker.
- Any stock mismatch, duplicate project/order/visit/case, reopened terminal state, premature closeout or cross-customer data exposure is a release blocker.
- All P0/P1 tests must pass before staging sign-off. Do not convert BLOCKED/NOT RUN into PASS.

## Local source verification

```cmd
npm ci
npm run verify:project-delivery-uat
npm run test:g16-project-delivery
npm run verify:phases-83-85
npm run verify:migration-integrity
```

These are source-contract checks, not substitutes for the staging database, browser and role-based UAT above.
