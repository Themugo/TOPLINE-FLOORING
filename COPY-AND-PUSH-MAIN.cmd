@echo off
setlocal
set "SOURCE=%~dp0TOPLINE-FLOORING-main"
set "TARGET=C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

echo Copying complete Topline project into:
echo %TARGET%
robocopy "%SOURCE%" "%TARGET%" /E /XD node_modules .git
if errorlevel 8 (
  echo ERROR: File copy failed.
  exit /b 1
)

cd /d "%TARGET%"
echo.
echo Running repository source verification...
call node scripts\verify-ecommerce-stability.mjs
if errorlevel 1 exit /b 1

echo.
echo Ready for dependency/database validation.
echo Do NOT push database migrations to production until local Supabase validation passes.
echo.
echo Next commands:
echo   npm install
echo   npm run typecheck
echo   npm run lint
echo   npm run build
echo   npx supabase start
echo   npx supabase db reset --local
echo   npx supabase db lint --local
echo   npx supabase test db --local
echo   npx supabase gen types typescript --local ^> src\types\database.ts
echo.
echo After validation:
echo   git status
echo   git add .
echo   git commit -m "feat: complete Topline ecommerce and migration stability foundation"
echo   git push origin main
endlocal
