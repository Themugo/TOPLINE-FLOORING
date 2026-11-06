@echo off
setlocal
cd /d %~dp0
if not exist .git (echo ERROR: Run this script from your cloned TOPLINE-FLOORING Git repository.&exit /b 1)
echo === TOPLINE PHASE 10 RELEASE ===
git checkout main || exit /b 1
git pull origin main || exit /b 1
npm ci || exit /b 1
npm run verify:phase-10-finance-billing-360 || exit /b 1
npm run verify:migration-integrity || exit /b 1
npm run verify:ecommerce-stability || exit /b 1
npm run verify:commerce-entrypoints-360 || exit /b 1
npm run verify:phase-8-field-operations || exit /b 1
npm run verify:fulfillment-operations-360 || exit /b 1
npm run verify:launch-gap || exit /b 1
npm run typecheck || exit /b 1
npm run build || exit /b 1
git status
git add -A
git commit -m "feat: complete finance and billing operations 360" || exit /b 1
git push origin main || exit /b 1
git log -1 --oneline
git status
endlocal
