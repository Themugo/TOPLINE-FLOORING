# Operation 12 — Data Governance, Privacy & Access Governance 360

## Purpose
Establish a single operational control surface for data classification, retention targets, data-subject requests and periodic staff access review.

## Business flow
Data domain → classification → owner → retention target → request handling → access review → evidence → management action.

## Controls
- Governance policies define classification, retention and handling requirements.
- Data-subject requests require a due date and explicit outcome before closure.
- Access reviews record the reviewed identity, due date, status, findings and completion evidence.
- All mutations use SECURITY DEFINER RPCs protected by existing staff RBAC.
- Tables are not directly writable by anonymous/authenticated clients.
- Records are evidence and workflow controls; they do not automatically delete data, change staff roles, or certify third-party provider retention.

## UAT
Production UAT must verify real customer-request handling, approved retention decisions, staff access-review cadence and evidence references in the authorized environment.
