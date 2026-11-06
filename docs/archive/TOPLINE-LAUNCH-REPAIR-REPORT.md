# TOPLINE Flooring & Roofing — Launch Repair Package

## Scope
This package repairs the production defects identified in the September 30, 2026 repository audit without replacing existing application architecture or removing existing business functionality.

## Fixed

### 1. Canonical services schema/application contract
The canonical `public.services` table was missing fields used by the admin and public service catalogue:

- `slug`
- `short_description`
- `icon`
- `features`

A forward-only migration was added:

`supabase/migrations/20260930170000_service_catalog_and_communications_worker_hardening.sql`

It:

- adds the missing columns idempotently;
- backfills deterministic unique slugs for existing services;
- backfills short descriptions where possible;
- normalizes missing/invalid feature arrays to JSON arrays;
- enforces non-null/unique service slugs;
- validates the feature-array contract;
- adds useful service indexes;
- preserves existing pricing/service-code fields.

### 2. Project/service relational contract
`project_services.service_id` is now available as a direct FK to `services`, while the existing `category_id` relationship is retained for backward compatibility. Existing project data is not rewritten.

### 3. Production communication worker execution
`operations-scheduler` now includes `deliver_communications` and invokes the existing `deliver-communications` Edge Function using the existing server-side `TOPLINE_WORKER_SECRET` boundary.

This closes the previously identified gap where queued communication records could exist without the scheduler invoking the actual provider delivery worker.

The existing worker remains responsible for:

- Brevo API delivery;
- idempotency;
- durable delivery-attempt recording;
- success/uncertain/failure handling;
- retry behavior.

### 4. Brevo security boundary retained
No Brevo credential was moved into frontend code or SQL. The API key remains an Edge Function/deployment secret.

## Verification performed

- Launch repair verifier: **17/17 passed**.
- Migration integrity verifier: **passed**.
- Schema contract verifier: **passed; 89 active migrations**.
- Brevo integration verifier: **14/14 passed**.
- JavaScript syntax check for the new verifier: **passed**.

## Environment limitation
The ZIP was supplied without `node_modules`. Two attempts to run `npm ci` exceeded the execution environment transport timeout, so a full Vite/TypeScript production build could not be executed in this analysis environment. The source-level and project-native static verification suite completed successfully.

After copying this repaired package into the local working repository, run:

```cmd
npm ci
npm run typecheck
npm run build:all
npm run lint
npm run verify:launch-repair
npm run verify:migration-integrity
npm run verify:schema-contract
npm run verify:brevo-email
```

## Production Supabase/Brevo acceptance still required
The repository cannot prove live provider state from source alone. Before public traffic is switched on, the production Supabase project must have the new migration applied and the Edge Functions/secrets deployed. Then perform a real inbox test and a real customer quotation/status-change email test.

The scheduler itself must also be invoked on a real production schedule. The repaired scheduler is ready for scheduled invocation; source code alone cannot activate a client-owned Supabase schedule.
