@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo TOPLINE FLOORING - PHASE 9 RELEASE
echo ================================================

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  exit /b 1
)

git checkout main || exit /b 1
git pull origin main || exit /b 1

npm ci || exit /b 1
npm run verify:phase-9-sales-crm-360 || exit /b 1
npm run verify:migration-integrity || exit /b 1
npm run verify:commerce-entrypoints-360 || exit /b 1
npm run verify:phase-8-field-operations || exit /b 1
npm run verify:fulfillment-operations-360 || exit /b 1
npm run verify:launch-gap || exit /b 1
npm run typecheck || exit /b 1
npm run build || exit /b 1

git status
git add -A
git commit -m "feat: complete sales and crm operations 360" || exit /b 1
git push origin main || exit /b 1

echo.
echo ================================================
echo PHASE 9 PUSH COMPLETE
echo ================================================
git log -1 --oneline
git status
endlocal
