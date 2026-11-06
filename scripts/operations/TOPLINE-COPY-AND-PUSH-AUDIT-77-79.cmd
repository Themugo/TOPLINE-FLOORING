@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo TOPLINE FLOORING - PHASES 77-79 END-TO-END VALIDATION
echo ==========================================================

call :run "[1/18] Vercel contract verification..." node scripts/verify-vercel-deployment.mjs || goto FAILED
call :run "[2/18] Toolchain verification..." node scripts/verify-toolchain.mjs || goto FAILED
call :run "[3/18] Invoice hook contract verification..." node scripts/verify-invoice-hook-contract.mjs || goto FAILED
call :run "[4/18] Public tracking contract..." node scripts/verify-public-tracking-contract.mjs || goto FAILED
call :run "[5/18] Public tracking privacy..." node scripts/verify-public-order-tracking-privacy.mjs || goto FAILED
call :run "[6/18] Commerce Fulfillment 360..." node scripts/verify-commerce-fulfillment-360.mjs || goto FAILED
call :run "[7/18] Authorization + Order Operations 360..." node scripts/verify-authorization-order-360.mjs || goto FAILED
call :run "[8/18] Order Operations 360 type contract..." node scripts/verify-order-operations-360.mjs || goto FAILED
call :run "[9/18] Commerce Entry-Point Consistency 360..." node scripts/verify-commerce-entrypoints-360.mjs || goto FAILED
call :run "[10/18] Fulfillment Operations 360..." node scripts/verify-fulfillment-operations-360.mjs || goto FAILED
call :run "[11/18] Release verification..." node scripts/verify-release-candidate.mjs || goto FAILED
call :run "[12/18] Migration and commerce verification..." node scripts/verify-migration-integrity.mjs || goto FAILED
call :run "[13/18] Payment/inventory lifecycle..." node scripts/verify-payment-inventory-lifecycle.mjs || goto FAILED
call :run "[14/18] Payment/refund/provider boundary..." node scripts/verify-payment-refund-expiry.mjs || goto FAILED
call :run "[15/18] Installing exact lockfile dependencies..." npm ci || goto FAILED
call :run "[16/18] Lint..." npm run lint || goto FAILED
call :run "[17/18] TypeScript..." npm run typecheck || goto FAILED
call :run "[18/18] Production build..." npm run build || goto FAILED

if not exist "dist\index.html" (
  echo PRODUCTION BUILD FAILED: dist\index.html was not generated.
  goto FAILED
)

echo.
echo ==========================================================
echo ALL VALIDATION AND BUILD GATES PASSED
echo ==========================================================
echo.
git status --short

git add .
if errorlevel 1 goto FAILED

git diff --cached --quiet
if not errorlevel 1 (
  echo No changes detected. Nothing to commit or push.
  goto SUCCESS
)

git commit -m "feat: harden fulfillment operations 360"
if errorlevel 1 goto FAILED

git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo PHASES 77-79 PUSHED SUCCESSFULLY
echo ==========================================================
goto SUCCESS

:run
echo.
echo %~1
shift
%*
exit /b %errorlevel%

:FAILED
echo.
echo ==========================================================
echo FAILED - NOTHING WAS PUSHED
if not "%GIT_COMMIT%"=="" echo Review the command output above.
echo ==========================================================
pause
exit /b 1

:SUCCESS
echo.
pause
exit /b 0
