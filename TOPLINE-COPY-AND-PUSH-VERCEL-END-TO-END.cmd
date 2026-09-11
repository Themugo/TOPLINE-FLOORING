@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo TOPLINE FLOORING - PHASE 68-70 END-TO-END VALIDATION
echo ==========================================================
echo.

echo [1/12] Vercel contract verification...
call node scripts\verify-vercel-deployment.mjs
if errorlevel 1 goto FAILED

echo.
echo [2/12] Toolchain verification...
call node scripts\verify-toolchain.mjs
if errorlevel 1 goto FAILED

echo.
echo [3/12] Invoice hook contract verification...
call node scripts\verify-invoice-hook-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [4/12] Public tracking contract verification...
call node scripts\verify-public-tracking-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [5/12] Public order tracking privacy initiative...
call node scripts\verify-public-order-tracking-privacy.mjs
if errorlevel 1 goto FAILED

echo.
echo [6/12] Commerce Fulfillment 360 contract...
call node scripts\verify-commerce-fulfillment-360.mjs
if errorlevel 1 goto FAILED

echo.
echo [7/12] Release verification...
call node scripts\verify-release-candidate.mjs
if errorlevel 1 goto FAILED

echo.
echo [8/12] Migration and commerce verification...
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
echo [9/12] Installing exact lockfile dependencies...
call npm ci
if errorlevel 1 goto FAILED

echo.
echo [10/12] Lint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [11/12] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [12/12] Production Vite build...
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
git commit -m "feat: harden commerce fulfillment 360 lifecycle"
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
