# G-15 — Leads and CRM certification report

**Foundation:** `TOPLINE-FLOORING-G-14-COMMERCE-CERTIFICATION-2026-11-07.zip`  
**Scope:** public enquiries, lead intake, admin lead management, CRM pipeline, filtering/search, lifecycle status, lead conversion, authorization and audit integrity.

## Audit findings
The repository contains separate Leads and CRM views backed by the shared lead data hook. The lead lifecycle schema and conversion hardening are already present. Existing Phase 15 work establishes transactional conversion with a row lock, normalized-email matching, concurrency serialization, idempotent replay and a lifecycle audit event. Existing end-to-end lead verifier also covers frontend/database naming normalization and null-safe search, lead create/update authorization and error/retry display.

No additional schema migration was warranted for this certification pass. Added a focused G-15 source verifier and package scripts that keep the established end-to-end, Phase 15 and Phase 15–17 regression verifiers grouped.

## Execution results
- `verify:leads-end-to-end-360`: passed.
- `verify:phase-15-crm-lifecycle`: passed.
- `verify:phase-15-17-lifecycle-360`: passed.
- New `verify:g15-leads-crm`: passed after packaging.
- An attempted `verify:track-contact-workflows` command was not a registered npm script; it was not counted as a test failure and no replacement script was invented.

## Live acceptance still required
G-15 remains **OPEN** until staging proves:
1. Website contact/quotation enquiry creates one lead with correct source attribution.
2. Duplicate/replayed submissions are handled according to the database contract.
3. Authorized staff can create, edit, assign/advance, and convert leads; unauthorized roles are denied.
4. Concurrent lead conversion with normalized duplicate email yields one canonical customer.
5. Notes/reminders and lifecycle audit history persist and are visible to permitted staff.
6. Browser CRM workflow passes on desktop and mobile with real staging roles/data.

No staging credentials, mailbox, live database or browser session were available in this workspace. No production data, migrations, deployment, Git commit or push was performed.

## Windows CMD
```cmd
npm ci
npm run verify:g15-leads-crm
npm run test:g15-leads-crm
```
Collect sanitized logs and staging evidence. Never paste credentials or personal customer data into logs or chat.
