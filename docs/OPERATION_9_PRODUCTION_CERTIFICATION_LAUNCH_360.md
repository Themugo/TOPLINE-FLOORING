# Operation 9 — Production Certification & Launch 360

## Objective

Certify the existing Topline platform as a release candidate without adding feature work unless certification exposes a real production gap.

This operation is a **release certification and launch-control initiative**, not another product expansion cycle.

## Certification surface

The gate covers:

1. Repository and deterministic toolchain
2. Dedicated Supabase target and public environment contract
3. Active migration chronology and manifest truth
4. Frontend route/import integrity
5. Cumulative Operations 1–8 verification registration
6. RLS/RBAC and server credential boundary checks already established by the cumulative suite
7. Payment fail-closed boundary
8. Vercel build/output/security-header contract
9. Production launch runbook completeness
10. Explicit separation between source-certified controls and external UAT/deployment evidence

## Implementation

Run:

```cmd
npm run verify:operation-9-production-certification
```

The verifier is intentionally structural. It does **not** claim that a remote Supabase database was migrated, a payment provider was activated, DNS was cut over, or real email/SMS/business UAT succeeded.

## Current release chain

- Active migrations: 52
- Latest migration at Operation 9 certification: `20260913080000_081_executive_operations_control_360.sql` (later cumulative operations may append migrations)
- Dedicated Supabase project: `zmbsskvnzjdaxuxlauyx`
- Canonical website: `https://toplineflooringandwaterproofing.co.ke`

## Required external evidence before launch

The authorized production operator must still complete and record:

- `npm ci`, lint, typecheck and production build
- local Supabase migration replay, lint and database tests
- linked Supabase migration list and `db push --dry-run --linked`
- approved remote migration application
- Auth Site URL / redirect configuration
- Storage policy verification
- Brevo delivery and inbound/SMTP checks
- Africa's Talking SMS handset and delivery-report checks
- payment provider sandbox/UAT, including duplicate webhook, failure, reversal and refund cases
- Vercel deployment, custom domain, HTTPS and canonical `www` behaviour
- catalogue, quotation, customer portal, checkout, fulfilment, project delivery, invoice, communications, tracking and after-sales business UAT
- backup/restore evidence and rollback readiness

## Safety rules

- Never run `supabase db reset --linked` against production.
- Never commit service-role, provider secrets or private keys.
- Never put server secrets in `VITE_*` variables.
- Do not declare production readiness from source inspection alone.
- Keep the existing site/infrastructure available until business acceptance and rollback readiness are confirmed.

## CI

Operation 9 is a cumulative CI gate after Operations 1–8. It is deliberately independent of the latest migration number so later migrations do not invalidate an earlier operation verifier.
