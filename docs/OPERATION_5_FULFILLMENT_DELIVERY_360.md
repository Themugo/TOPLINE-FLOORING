# Operation 5 — Fulfillment & Delivery 360

## Business operation

Paid order → fulfillment readiness → delivery creation → driver assignment → picking → scheduling → dispatch → in transit → proof of delivery → public tracking → exception recovery → completion.

## Controls

- Dispatch requires a fully paid order, delivery address and active staff driver.
- Fulfillment readiness is checked server-side and records the decision.
- Driver assignment is validated against active `staff_profiles`.
- Picking, rescheduling, exceptions and recovery are audited.
- Delivery completion requires recipient identity and proof by URL or note.
- Public tracking remains privacy-bounded through the canonical tracking RPC.
- Sensitive fulfillment mutations use protected RPCs; direct client DML is not introduced.

## Validation

Run:

```cmd
npm run verify:operation-5-fulfillment-delivery
npm run verify:migration-integrity
npm run verify:release-candidate
```

Then use local Supabase replay before linking/pushing migrations to the dedicated Topline Supabase project.
