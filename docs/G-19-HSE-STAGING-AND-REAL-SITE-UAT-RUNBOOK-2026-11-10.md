# G-19 HSE — Staging and Real-Site UAT Runbook

**Purpose:** Close G-19 with reproducible staging evidence and a separate competent-person real-site inspection. This runbook is not a substitute for a site-specific risk assessment or Kenyan statutory HSE advice.

## A. Staging prerequisites and safety

- Use an isolated, disposable/staging Supabase project, never the canonical production project.
- Obtain explicit owner approval before applying the migration.
- Use synthetic staff and site records only; do not upload identity documents, medical records or real worker personal data.
- Confirm migration replay from an empty database and migration history before executing cases.
- Record environment/project reference, migration version, timestamp, operator, test account role and evidence reference for every case.
- Never run destructive reset or migration apply against production.

## B. Database and authorization cases

| ID | Test | Expected result |
|---|---|---|
| HSE-DB-01 | Apply all migrations to fresh disposable PostgreSQL | All migrations replay in order; G-19 follow-up recorded once |
| HSE-DB-02 | Anonymous caller invokes HSE snapshot/create/update RPC | Denied |
| HSE-DB-03 | Authenticated customer without staff project permission invokes HSE mutation | Denied |
| HSE-DB-04 | Authorized staff reads HSE snapshot | Allowed, scoped to the staff permission model |
| HSE-DB-05 | Direct authenticated table INSERT/UPDATE/DELETE | Denied by RLS/grants |
| HSE-DB-06 | Unprivileged caller invokes function with altered search path | No privilege escalation; function uses pinned search_path |

## C. Site readiness cases

| ID | Test | Expected result |
|---|---|---|
| HSE-SITE-01 | Create site control with all required fields | Active control created |
| HSE-SITE-02 | Omit responsible safety owner | Rejected |
| HSE-SITE-03 | Omit PPE requirements/applicability note | Rejected |
| HSE-SITE-04 | Omit emergency arrangements | Rejected |
| HSE-SITE-05 | Omit or set past review date | Rejected |
| HSE-SITE-06 | Set induction required | Snapshot retains induction requirement |
| HSE-SITE-07 | Suspend site control, then attempt event creation | Rejected |

## D. HSE event lifecycle cases

| ID | Test | Expected result |
|---|---|---|
| HSE-EVT-01 | Create incident without immediate control | Rejected |
| HSE-EVT-02 | Create high/critical event without immediate control | Rejected |
| HSE-EVT-03 | Create incident/high-risk event with immediate control | Accepted |
| HSE-EVT-04 | Attempt `open → controlled` | Rejected |
| HSE-EVT-05 | Progress `open → investigating → controlled → resolved → closed` | Accepted sequentially, subject to action closure gate |
| HSE-EVT-06 | Attempt `resolved → investigating` | Rejected |
| HSE-EVT-07 | Attempt `closed → resolved/open` | Rejected |
| HSE-EVT-08 | Close event with any linked action not closed | Rejected |
| HSE-EVT-09 | Close event after all linked actions are closed | Accepted |
| HSE-EVT-10 | Add corrective action to resolved/closed event | Rejected |

## E. Corrective-action lifecycle cases

| ID | Test | Expected result |
|---|---|---|
| HSE-ACT-01 | Create action without owner | Rejected |
| HSE-ACT-02 | Create action without due date | Rejected |
| HSE-ACT-03 | Create action with owner and due date | Accepted |
| HSE-ACT-04 | Attempt `open → completed` | Rejected |
| HSE-ACT-05 | Progress `open → in_progress → blocked → in_progress → completed` | Accepted |
| HSE-ACT-06 | Assigned owner attempts to verify own action | Rejected |
| HSE-ACT-07 | Different authorized staff member verifies completed action with notes | Accepted and verifier/timestamp recorded |
| HSE-ACT-08 | Verify completed action without notes | Rejected |
| HSE-ACT-09 | Attempt `completed → closed` without verification | Rejected |
| HSE-ACT-10 | Close verified action with recorded verification notes | Accepted |
| HSE-ACT-11 | Attempt to reopen closed action | Rejected |

## F. Browser/admin workflow cases

- Verify site creation prompts for owner, PPE applicability, emergency arrangements and future review date.
- Verify event creation requires immediate control for incident/high/critical events.
- Verify resolved events offer closure but do not offer Add action.
- Verify corrective action creation requires owner and due date.
- Verify the action owner cannot perform independent verification; use a second authorized staff account.
- Verify failed snapshot loads clear stale metrics and display unavailable state rather than false zero.
- Test mobile viewport widths 320, 360, 390 and 430 px, plus desktop. Confirm all controls remain usable and no page action is obscured.

## G. Actual site inspection — competent HSE lead only

Complete this section at the actual worksite. Record factual observations and attach evidence references in the approved HSE repository; do not invent a pass result to complete the form.

1. Site-specific risk assessment and method statement reviewed for the actual flooring/waterproofing activities.
2. Worker induction and attendance verified; competency/training records checked where applicable.
3. PPE suitability, availability, condition and actual use observed.
4. Emergency arrangements, assembly point, first aid provision and emergency contacts verified.
5. Fire controls and evacuation route inspected; drill evidence recorded where required.
6. Tools, electrical equipment, ladders, access equipment and other task equipment inspected as applicable.
7. Permits and task-specific controls reviewed where applicable (e.g. work at height, hot work, confined space, electrical isolation).
8. Housekeeping, slips/trips, manual handling, chemical/SDS controls and waste handling reviewed.
9. Toolbox talk conducted and attendance/evidence recorded.
10. Hazards, near misses and incidents recorded with immediate controls; corrective actions assigned to named owners and due dates.
11. Corrective actions independently verified by someone other than the assigned owner.
12. Competent HSE lead records findings, outstanding actions, restrictions and sign-off decision.

## H. Release/closure decision

G-19 may be marked closed only when:

- All staging database and authorization cases pass with retained evidence.
- Browser/admin workflow cases pass.
- A real site inspection has been completed by a competent HSE person.
- Critical/high hazards are controlled and action owners/due dates are recorded.
- Required training, induction, permits, equipment and emergency evidence is available and reviewed.
- The HSE lead signs the actual site outcome and any restrictions.

Any failed or unavailable evidence remains OPEN/BLOCKED. Do not label the platform or company statutorily certified based only on source-code tests.
