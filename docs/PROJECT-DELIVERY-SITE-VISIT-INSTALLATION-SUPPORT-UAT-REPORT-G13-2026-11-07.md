# Project Delivery, Site Visit, Installation & Support UAT Report

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-LEADS-CRM-LIVE-UAT-G13-2026-11-07.zip`  
**Foundation SHA-256:** `fb626189896741fdb7c2c3c1a9d68bc6cff94a21206b403ff43cbbcd8c2bba58`  
**Scope:** Project delivery, site visits, installation workforce and after-sales support/warranty.

## Executive result

- New project-delivery UAT source-contract verifier: **33/33 passed**.
- Existing G-16/related focused lifecycle suite: **passed** (G-16 13/13; Phase 16 16/16; Phase 17 19/19; Phase 19 15/15; project document, Operation 2 and G-16 checks passed).
- Phases 83–85 service quality/warranty/feedback verifier: **passed**.
- Migration integrity verifier: **passed**, 165 active migrations.
- Full repository `npm run verify:all`: **190/190 passed, 0 failed**.
- CI workflow YAML parse: **passed**.

These results are repository/source-contract verification. They are not live staging UAT or production certification.

## Source defects repaired

1. **Installation Workforce read failures were silently converted into empty lists.** The loader did not inspect Supabase query errors and could present an empty installation/staff/assignment view as if there were no records. It now checks all three query errors, retains an inline alert and exposes a retry action.
2. **Warranty & Service read failures were only surfaced as transient toast messages.** The service-case workspace now retains an inline error state and exposes a retry action while preserving the existing toast feedback.

No schema, migration, RPC contract, business rule, route or data model was changed for these repairs.

## Coverage added

A dedicated `scripts/verify-project-delivery-uat.mjs` verifier now checks project closeout gates, measurement/material RPC contracts, site visit authorization and terminal transitions, installation assignment uniqueness/active staff/row locking, service-case ownership and status transitions, warranty/SLA/feedback controls, RLS boundaries and read-error recovery. It is registered as `npm run verify:project-delivery-uat`, included in `npm run test:g16-project-delivery`, and added to CI.

A 36-case staging runbook and evidence template were added:
- `docs/PROJECT-DELIVERY-SITE-VISIT-INSTALLATION-SUPPORT-UAT-RUNBOOK-2026-11-07.md`
- `docs/PROJECT-DELIVERY-UAT-EVIDENCE-TEMPLATE-2026-11-07.md`

The runbook covers quotation-to-project continuity, task/issue/measurement persistence, stock allocation including concurrent final-stock allocation, site visit validation, installation workforce and concurrent status changes, quality and customer sign-off gates, support/warranty lifecycle, customer feedback, authorization boundaries, read failures and responsive browser acceptance.

## Important UAT gates still open

The following require a running staging Supabase project and real authenticated staging identities and were **not executed** in this environment:

- Actual quotation → order → project record continuity.
- Concurrent material allocation and database stock/ledger reconciliation.
- Site visit RPC execution against staging rows and real role permissions.
- Installation team assignment and concurrent status transition sessions.
- Quality inspection and customer sign-off end-to-end closeout.
- Support case creation, warranty entitlement calculation, SLA reconciliation and customer feedback using customer/staff sessions.
- RLS cross-customer denial, private document access and browser tests across mobile/tablet/desktop.

No `npm ci`, TypeScript build, Vite production build, browser automation, local PostgreSQL/Supabase replay or linked Supabase operation was run because dependencies and the local Supabase toolchain were not provisioned in this workspace.

## Safety boundary

No production database, customer data, provider, storage, DNS, hosting, deployment, Git remote, commit or push was changed. Do not treat this report as a GO decision for production. Production release remains **NO-GO pending staging UAT evidence and review of all blocked tests**.
