@echo off
setlocal
set "SOURCE=%~dp0TOPLINE-FLOORING-main"
set "TARGET=C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

echo Copying Phase 51-53 complete project into:
echo %TARGET%
robocopy "%SOURCE%" "%TARGET%" /E /XD node_modules .git
if errorlevel 8 (
  echo ERROR: File copy failed.
  exit /b 1
)

cd /d "%TARGET%"
echo.
echo Running source verification...
call node scripts\verify-payment-inventory-lifecycle.mjs
if errorlevel 1 exit /b 1
call node scripts\verify-migration-integrity.mjs
if errorlevel 1 exit /b 1
call node scripts\verify-ecommerce-stability.mjs
if errorlevel 1 exit /b 1
call node scripts\verify-remote-deploy-gate.mjs
if errorlevel 1 exit /b 1

echo.
echo Phase 51-53 source verification passed.
echo.
echo REQUIRED BEFORE PRODUCTION DATABASE DEPLOYMENT:
echo   npm install

echo   npm run typecheck

echo   npm run lint

echo   npm run build

echo   npx supabase start

echo   npx supabase db reset --local

echo   npx supabase db lint --local

echo   npx supabase test db --local

echo   npx supabase gen types typescript ^> src\types\database.ts

echo.
echo AFTER LOCAL VALIDATION:
echo   npx supabase login

echo   npx supabase link --project-ref zmbsskvnzjdaxuxlauyx

echo   npx supabase migration list --linked

echo   npx supabase db push --dry-run --linked

echo.
echo COMMIT AND PUSH:
echo   git status

echo   git add .
echo   git commit -m "feat: harden payment and inventory lifecycle"
echo   git push origin main
endlocal
