# Topline Local Verification Repair

This repair package addresses the failures reported after the RPC Authorization + RLS/IDOR + Storage 360 package was committed.

## Fixed

- Added the two missing npm script aliases expected by the deployment instructions:
  - `verify:application-security-trust-boundary`
  - `verify:rpc-authorization-certification`
- Fixed `createLead` source typing so nullable database values are accepted.
- Replaced unavailable `BriefcaseBusiness` Lucide icon with `Briefcase`.
- Corrected `CustomerPortalOperations` to use the existing canonical `./dashboard` AdminLayout.
- Corrected the Field Operations metric tuple so Lucide icons retain their component type.
- Removed unused Finance imports/variables.
- Normalized Supabase's nested delivery order result before assigning it to the UI row model.
- Typed Fulfillment metric cards explicitly.
- Normalized optional verification notes for HSE and QA corrective-action updates.
- Typed Project Delivery project rows explicitly.
- Typed Sales Command Center icon tuples explicitly.
- Removed the unused Reports `OrderRow` declaration.
- Fixed the self-referential `selectedRpVariant` declaration on the product page.

## Verification

Passed in the repair workspace:

- Migration deployment static verification — 68 migrations
- Application Security & Trust Boundary static verification
- RPC Authorization Certification static verification
- Node syntax checks for security verification scripts

TypeScript/build could not be executed in the repair workspace because the temporary environment did not contain a complete TypeScript/Vite installation. The user's machine did have dependencies installed, so the supplied CMD should be run there.

## Environment issue reported by the user's machine

The repository declares Node 22.x, while the machine is using Node 26.1.0. This produced `EBADENGINE` warnings. Use Node 22.x for the supported toolchain.

The machine also reported 22 npm audit vulnerabilities. Do not run a blanket `npm audit fix` as part of this security repair without reviewing the resulting dependency changes; it can introduce unrelated breaking changes.

Supabase CLI deployment/lint returned HTTP 403 because the logged-in Supabase account does not have the required project/platform privileges and the database password was not available to the CLI. This is an account/CLI authentication boundary, not a migration failure.
