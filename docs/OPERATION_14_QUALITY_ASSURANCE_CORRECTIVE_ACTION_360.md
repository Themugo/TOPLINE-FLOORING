# Operation 14 — Quality Assurance & Corrective Action 360

## Purpose
Create one controlled quality lifecycle across projects, suppliers, deliveries, service cases, maintenance and warehouse operations.

## Lifecycle
**Inspection → Finding → Corrective Action → Completion → Verification → Closure**

## Controls
- Inspections use controlled reference domains and scored outcomes.
- Findings require a severity and actionable remediation plan.
- Corrective actions can be open, in progress, blocked, completed, verified or closed.
- Verification and closure require explicit evidence notes.
- An inspection cannot be closed while any linked corrective action remains open.
- Browser mutations are routed through SECURITY DEFINER RPCs and staff authorization.

## Production boundary
This operation records operational quality evidence; it does not claim an external certification, laboratory result, supplier accreditation or regulatory approval unless evidence is actually entered and independently verified.

## Verification
Run `npm run verify:operation-14-quality-assurance` and the cumulative CI suite. Dependency-aware frontend checks remain governed by the normal CI `npm ci` workflow.
