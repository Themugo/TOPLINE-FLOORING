@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo TOPLINE DATABASE SOURCE-OF-TRUTH DEPLOYMENT
echo ============================================================
echo.
echo This applies the ordered Supabase migration chain only.
echo It does NOT reset or delete the production database.
echo.

if not exist "supabase\migrations" (
  echo ERROR: supabase\migrations not found.
  exit /b 1
)

node scripts\verify-database-source-of-truth-360.mjs
if errorlevel 1 exit /b 1

where supabase >nul 2>&1
if errorlevel 1 (
  echo ERROR: Supabase CLI is not installed/on PATH.
  echo Install/login first, then rerun this script.
  exit /b 1
)

set SUPABASE_PROJECT_REF=zmbsskvnzjdaxuxlauyx

echo.
echo [1/3] Link project if needed...
supabase link --project-ref %SUPABASE_PROJECT_REF%
if errorlevel 1 exit /b 1

echo.
echo [2/3] Preview pending migrations...
supabase db push --dry-run
if errorlevel 1 exit /b 1

echo.
echo Review the dry-run above. Press Ctrl+C to stop, or press any key to APPLY.
pause >nul

echo.
echo [3/3] Applying migrations...
supabase db push
if errorlevel 1 (
  echo.
  echo DATABASE DEPLOYMENT FAILED.
  echo Do not reset the production database. Capture the error output.
  exit /b 1
)

echo.
echo DATABASE MIGRATIONS APPLIED SUCCESSFULLY.
echo Next: run the communications and database verification commands.
exit /b 0
