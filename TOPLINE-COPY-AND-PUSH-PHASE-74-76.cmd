@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo TOPLINE FLOORING - PHASES 74-76 END-TO-END VALIDATION
echo ==========================================================
echo.

echo [1/13] Vercel contract verification...
call node scripts\verify-vercel-deployment.mjs
if errorlevel 1 goto FAILED

echo.
echo [2/13] Toolchain verification...
call node scripts\verify-toolchain.mjs
if errorlevel 1 goto FAILED

echo.
echo [3/13] Invoice hook contract verification...
call node scripts\verify-invoice-hook-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [4/13] Public tracking contract verification...
call node scripts\verify-public-tracking-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [5/13] Public order tracking privacy initiative...
call node scripts\verify-public-order-tracking-privacy.mjs
if errorlevel 1 goto FAILED

echo.
echo [6/13] Commerce Fulfillment 360 contract...
call node scripts\verify-commerce-fulfillment-360.mjs
if errorlevel 1 goto FAILED

echo.
echo [7/13] Authorization + Order Operations 360 contract...
call node scripts\verify-authorization-order-360.mjs
if errorlevel 1 goto FAILED

echo.
echo [8/14] Order Operations 360 type contract...
call node scripts\verify-order-operations-360.mjs
if errorlevel 1 goto FAILED

echo.
echo [9/15] Commerce Entry-Point Consistency 360 contract...
call node scripts\verify-commerce-entrypoints-360.mjs
if errorlevel 1 goto FAILED

echo.
echo [10/15] Release verification...
call node scripts\verify-release-candidate.mjs
if errorlevel 1 goto FAILED

echo.
echo [11/15] Migration and commerce verification...
call node scripts\verify-migration-integrity.mjs
if errorlevel 1 goto FAILED
call node scripts\verify-ecommerce-stability.mjs
if errorlevel 1 goto FAILED
call node scripts\verify-payment-inventory-lifecycle.mjs
if errorlevel 1 goto FAILED
call node scripts\verify-payment-refund-expiry.mjs
if errorlevel 1 goto FAILED
call node scripts\verify-payment-provider-boundary.mjs
if errorlevel 1 goto FAILED

echo.
echo [12/15] Installing exact lockfile dependencies...
call npm ci
if errorlevel 1 goto FAILED

echo.
echo [13/15] Lint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [14/15] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [15/15] Production Vite build...
call npm run build
if errorlevel 1 goto FAILED
if not exist "dist\index.html" goto FAILED

echo.
echo ==========================================================
echo BUILD PASSED - STAGING AND PUSHING
echo ==========================================================
echo.
git status
git add .
git commit -m "feat: converge commerce entry points 360"
if errorlevel 1 goto FAILED

git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo SUCCESS - PUSHED TO MAIN
echo ==========================================================
echo.
git log -1 --oneline
git status -sb
echo.
echo Vercel should now create a new production deployment.
echo.
pause
goto END

:FAILED
echo.
echo ==========================================================
echo FAILED - NOTHING WAS PUSHED
echo ==========================================================
echo.
echo The failing command is shown immediately above.
echo Fix the reported error before retrying.
echo.
pause

:END
endlocal
