@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo TOPLINE FLOORING - PHASE 65-67 END-TO-END VALIDATION
echo ==========================================================
echo.

echo [1/11] Vercel contract verification...
call node scripts\verify-vercel-deployment.mjs
if errorlevel 1 goto FAILED

echo.
echo [2/11] Toolchain verification...
call node scripts\verify-toolchain.mjs
if errorlevel 1 goto FAILED

echo.
echo [3/11] Invoice hook contract verification...
call node scripts\verify-invoice-hook-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [4/11] Public tracking contract verification...
call node scripts\verify-public-tracking-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [5/11] Public order tracking privacy initiative...
call node scripts\verify-public-order-tracking-privacy.mjs
if errorlevel 1 goto FAILED

echo.
echo [6/11] Release verification...
call node scripts\verify-release-candidate.mjs
if errorlevel 1 goto FAILED

echo.
echo [7/11] Migration and commerce verification...
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
echo [8/11] Installing exact lockfile dependencies...
call npm ci
if errorlevel 1 goto FAILED

echo.
echo [9/11] Lint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [10/11] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [11/11] Production Vite build...
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
git commit -m "feat: harden public order tracking and confirmation flow"
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
