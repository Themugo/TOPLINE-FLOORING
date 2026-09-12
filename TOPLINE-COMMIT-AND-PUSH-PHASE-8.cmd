@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo TOPLINE FLOORING - PHASE 8 FULL BUILD COMMIT / PUSH
echo ============================================================
echo.

echo [1/7] Checking Git repository...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  echo Clone the GitHub repository into this folder first, then copy these project files over it.
  exit /b 1
)

echo [2/7] Updating main branch...
git checkout main
if errorlevel 1 exit /b 1
git pull origin main
if errorlevel 1 exit /b 1

echo [3/7] Installing exact dependencies...
npm ci
if errorlevel 1 exit /b 1

echo [4/7] Running verification suite...
npm run verify:migration-integrity
if errorlevel 1 exit /b 1
npm run verify:commerce-entrypoints-360
if errorlevel 1 exit /b 1
npm run verify:phase-8-field-operations
if errorlevel 1 exit /b 1
npm run verify:fulfillment-operations-360
if errorlevel 1 exit /b 1
npm run verify:launch-gap
if errorlevel 1 exit /b 1

echo [5/7] Type checking...
npm run typecheck
if errorlevel 1 exit /b 1

echo [6/7] Production build...
npm run build
if errorlevel 1 exit /b 1

echo [7/7] Commit and push...
git status
git add -A
git commit -m "feat: complete field operations 360 and production hardening"
if errorlevel 1 (
  echo No commit created. If Git reports nothing to commit, the working tree may already be clean.
  exit /b 1
)
git push origin main
if errorlevel 1 exit /b 1

echo.
echo ============================================================
echo PUSH COMPLETE
echo ============================================================
git log -1 --oneline
git status
endlocal
