@echo off
setlocal
cd /d "%~dp0"

echo [1/7] Verifying migration uniqueness...
node scripts\verify-clean-project-integrity.mjs || exit /b 1

echo [2/7] Verifying Phase 11...
node scripts\verify-phase-11-inventory-procurement-360.mjs || exit /b 1

echo [3/7] Verifying Phase 12...
node scripts\verify-phase-12-customer-portal-360.mjs || exit /b 1

echo [4/7] Verifying Phase 13...
node scripts\verify-phase-13-backup-export-360.mjs || exit /b 1

echo [5/7] Verifying migration integrity...
node scripts\verify-migration-integrity.mjs || exit /b 1

echo [6/7] Staging complete clean rebuild...
git add -A || exit /b 1

git diff --cached --quiet
if %errorlevel%==0 (
  echo No changes to commit. Repository is already at this clean build.
  exit /b 0
)

echo [7/7] Committing and pushing...
git commit -m "chore: clean rebuild and restore canonical project flow" || exit /b 1
git push origin main || exit /b 1

echo.
echo CLEAN REBUILD COMMITTED AND PUSHED SUCCESSFULLY.
endlocal
