# Vercel Build Repair

## Deployment failure diagnosed from production logs

The failed Vercel deployment reached the frontend quality checks and exposed two separate classes of failure:

1. TypeScript contract errors in application code.
2. A Windows-only local build invocation failure caused by the local project path containing `&` (`TOPLINE FLOORING & ROOFING`).

The Vercel environment itself does not contain that Windows path, so the path issue is a local validation problem, not a Vercel runtime problem. The repository now uses a direct Node invocation for the Vite binary in `npm run build`, which avoids the Windows `.cmd` shim/path parsing failure while remaining valid on Vercel.

## Application corrections

- Removed unsupported `BriefcaseBusiness` icon imports and use the supported `Briefcase` icon.
- Normalized nullable order totals before passing them to `formatKES`.
- Adapted React `ErrorInfo.componentStack` from `string | null | undefined` to the logger's optional string contract.
- Restored missing lifecycle/finance imports in `use-data.ts`.
- Removed the unused invoice-total recalculation stub.
- Removed the unused invoice-item `taxRate` parameters from the frontend hook and admin caller; invoice item transaction recalculation already derives the tax rate from the persisted invoice record in the database RPC, so the unused client parameter was not part of the authoritative calculation.
- Added explicit invoice transaction result types and removed explicit `any` from the finance transaction layer.
- Replaced delivery `any` with explicit delivery/order types.
- Replaced workforce `any` with explicit installation/staff/assignment types.
- Replaced project-delivery measurement/action `any` types with explicit types.
- Replaced project-profitability and service-case `any` types with explicit domain types.
- Removed an unused product-image argument.
- Replaced `String.prototype.replaceAll` with a compatible regular expression replacement and raised the TypeScript library target to ES2021.
- Corrected coupon validation property names to match `CouponValidationResult` (`discount_type`, `discount_value`, `discount_amount`) and added safe defaults.
- Removed the unused Supabase client from the intentionally fail-closed payment webhook boundary.

## Validation

Static repository gates pass after these changes. A full `npm ci`, ESLint, TypeScript and Vite build must still be executed in a networked Windows/CI environment because this execution environment cannot download the npm dependency tree.

Do not claim a production deployment passed until the Vercel deployment log shows the new commit completing `npm run build` successfully.
