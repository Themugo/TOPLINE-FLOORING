@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo TOPLINE FLOORING - END-TO-END BUILD REPAIR VALIDATION
echo ==========================================================
echo.

echo [1/9] Vercel contract verification...
call node scripts\verify-vercel-deployment.mjs
if errorlevel 1 goto FAILED

echo.
echo [2/9] Toolchain verification...
call node scripts\verify-toolchain.mjs
if errorlevel 1 goto FAILED

echo.
echo [3/9] Invoice hook contract verification...
call node scripts\verify-invoice-hook-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [4/10] Public tracking contract verification...
call node scripts\verify-public-tracking-contract.mjs
if errorlevel 1 goto FAILED

echo.
echo [5/10] Release verification...
call node scripts\verify-release-candidate.mjs
if errorlevel 1 goto FAILED

echo.
echo [6/10] Migration and commerce verification...
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
echo [7/10] Installing exact lockfile dependencies...
call npm ci
if errorlevel 1 goto FAILED

echo.
echo [8/10] Lint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [9/10] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [10/10] Production Vite build...
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
git commit -m "fix: type public order tracking contract"
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
