# Operation 15 — Health, Safety & Site Compliance 360

## Purpose
Provide a server-authoritative site safety control loop for flooring, waterproofing and related project work.

## Flow
Site/project control → hazard/near miss/incident/observation/toolbox talk → immediate control → corrective action → verification → closure.

## Controls
- Risk levels: low, medium, high, critical.
- Site controls record induction, PPE, emergency notes, responsible owner and review date.
- HSE events use controlled event types and severity.
- Corrective actions have owners, due dates and lifecycle states.
- Event closure is blocked while linked corrective actions remain unverified/open.
- Verification notes are required before corrective-action verification or closure.
- Direct authenticated table mutations are revoked; staff-authorized RPCs are the mutation boundary.

## Production boundary
This operation does not claim statutory certification, external HSE accreditation, medical clearance, insurance compliance, regulator approval or a completed site safety audit. Those require real-world evidence and authorized review.

## G-19 lifecycle integrity addendum (2026-11-10)
- Site controls require a named responsible safety owner, explicit PPE requirements or a documented not-applicable reason, emergency arrangements, and a future review date.
- Events progress sequentially: `open → investigating → controlled → resolved → closed`; `closed` is terminal. High/critical incidents retain immediate-control evidence requirements.
- Corrective actions require an owner and due date; actions progress sequentially and cannot be added after the parent event is resolved.
- Verification is independent: the assigned action owner cannot verify their own completed action. Verification notes are required, and the parent event can close only after every linked corrective action is closed.
- These are application/database workflow controls. They do not replace an actual site inspection, competent HSE review, or statutory registers.
- See `G-19-HSE-CERTIFICATION-REMEDIATION-ADDENDUM-2026-11-10.md` and `G-19-HSE-STAGING-AND-REAL-SITE-UAT-RUNBOOK-2026-11-10.md`.
