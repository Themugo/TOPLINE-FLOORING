@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo TOPLINE HOME / MOBILE / ACCOUNT RELIABILITY VERIFICATION
echo ============================================================
echo.
node --version
if errorlevel 1 goto failed
if not exist "node_modules\eslint\bin\eslint.js" (
  echo Dependencies are missing. Run: npm ci
  goto failed
)
echo.
echo [1/7] ESLint
node ./node_modules/eslint/bin/eslint.js .
if errorlevel 1 goto failed
echo.
echo [2/7] TypeScript
echo Running npm run typecheck
call npm run typecheck
if errorlevel 1 goto failed
echo.
echo [3/7] Smoke tests
call npm run test:smoke
if errorlevel 1 goto failed
echo.
echo [4/7] Production build
call npm run build
if errorlevel 1 goto failed
echo.
echo [5/7] Full static verification
call npm run verify:all
if errorlevel 1 goto failed
echo.
echo [6/7] Whitespace / conflict-marker check
git diff --check
if errorlevel 1 goto failed
echo.
echo [7/7] Working-tree review
git status --short
echo.
echo VERIFICATION COMMAND COMPLETED. Review all output above before commit/push.
echo This script does not commit, push, or deploy.
pause
exit /b 0
:failed
echo.
echo VERIFICATION FAILED. Do not commit or deploy until the first failure is corrected.
pause
exit /b 1
