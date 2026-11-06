@echo off
cd /d "%~dp0"
if exist vitest.config.ts del /q vitest.config.ts
if not exist package.json (
  echo ERROR: Run this command from the extracted TOPLINE-FLOORING project folder.
  pause
  exit /b 1
)

echo ==============================================
echo TOPLINE FLOORING - PHASES 61-64
 echo REPOSITORY FOUNDATION HARDENING
echo ==============================================
echo.

echo Running repository toolchain verification...
node scripts\verify-toolchain.mjs
if errorlevel 1 goto FAIL

echo.
echo Running release verification...
node scripts\verify-release-candidate.mjs
if errorlevel 1 goto FAIL

echo.
echo Running migration verification...
node scripts\verify-migration-integrity.mjs
if errorlevel 1 goto FAIL

echo.
echo Running ecommerce verification...
node scripts\verify-ecommerce-stability.mjs
if errorlevel 1 goto FAIL

echo.
echo Running payment lifecycle verification...
node scripts\verify-payment-inventory-lifecycle.mjs
if errorlevel 1 goto FAIL
node scripts\verify-payment-refund-expiry.mjs
if errorlevel 1 goto FAIL
node scripts\verify-payment-provider-boundary.mjs
if errorlevel 1 goto FAIL

echo.
echo ==============================================
echo ALL REPOSITORY STATIC GATES PASSED
echo ==============================================
echo.
echo Git status before commit:
git status

echo.
echo Staging changes...
git add .
if errorlevel 1 goto FAIL

echo.
echo Creating commit...
git commit -m "fix: harden local validation and Supabase tooling"
if errorlevel 1 goto FAIL

echo.
echo Pushing to main...
git push origin main
if errorlevel 1 goto FAIL

echo.
echo ==============================================
echo PHASES 61-64 COMMITTED AND PUSHED
echo ==============================================
echo.
git log -1 --oneline
git status
pause
exit /b 0

:FAIL
echo.
echo ==============================================
echo PHASE 61-64 COMMAND FAILED
echo ==============================================
echo Review the error above. NOTHING FURTHER WAS RUN.
pause
exit /b 1
