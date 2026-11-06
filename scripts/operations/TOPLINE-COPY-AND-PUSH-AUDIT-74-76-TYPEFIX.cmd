@echo off
setlocal
cd /d "%~dp0"
echo ==========================================================
echo TOPLINE FLOORING - PHASES 74-76 TYPEFIX VALIDATION
 echo ==========================================================
node scripts/verify-vercel-deployment.mjs || goto FAILED
node scripts/verify-toolchain.mjs || goto FAILED
node scripts/verify-invoice-hook-contract.mjs || goto FAILED
node scripts/verify-public-tracking-contract.mjs || goto FAILED
node scripts/verify-public-order-tracking-privacy.mjs || goto FAILED
node scripts/verify-commerce-fulfillment-360.mjs || goto FAILED
node scripts/verify-authorization-order-operations-360.mjs || goto FAILED
node scripts/verify-order-operations-type-contract.mjs || goto FAILED
node scripts/verify-commerce-entrypoints-360.mjs || goto FAILED
node scripts/verify-release-candidate.mjs || goto FAILED
node scripts/verify-migration-integrity.mjs || goto FAILED
node scripts/verify-ecommerce-stability.mjs || goto FAILED
node scripts/verify-payment-inventory-lifecycle.mjs || goto FAILED
node scripts/verify-payment-refund-expiry.mjs || goto FAILED
node scripts/verify-payment-provider.mjs || goto FAILED
echo [16/18] Installing exact lockfile dependencies...
npm ci || goto FAILED
echo [17/18] Lint...
npm run lint || goto FAILED
echo [18/18] TypeScript and production build...
npm run typecheck || goto FAILED
npm run build || goto FAILED
if not exist dist\index.html goto FAILED
git add . || goto FAILED
git commit -m "fix: resolve phase 74-76 storefront type contract" || goto FAILED
git push origin main || goto FAILED
echo ==========================================================
echo SUCCESS - PHASES 74-76 TYPEFIX COMMITTED AND PUSHED
pause
exit /b 0
:FAILED
echo ==========================================================
echo FAILED - NOTHING WAS PUSHED
pause
exit /b 1
