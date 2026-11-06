# Local TypeScript Repair — Final 3 Errors

Applied fixes for the three errors reported by the Windows verification log:

1. `src/hooks/use-data.ts:948`
   - Normalized nullable lead source with `lead.source ?? undefined` to match `createLeadTransaction`.

2. `src/pages/admin/quality-assurance-360.tsx`
   - Changed the findings-summary conditional from truthiness on `unknown` to an explicit null check so React never receives an `unknown` value as a child.

3. `src/pages/admin/reliability-operations-360.tsx`
   - Used optional chaining on `resolutionSummary` in the resolved-state guard.

The supplied log also shows that `npm run build` already succeeds. The remaining `npx supabase db push --linked` and `db lint --linked` 403 is a Supabase account/CLI privilege or database-password configuration issue, not a TypeScript/build failure.
