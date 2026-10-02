@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo TOPLINE direct Supabase deployment fallback
echo This bypasses the pooler and requires a network with IPv6 support.
echo Production remote database reset is prohibited; this script only links and pushes migrations.
echo.
node scripts\verify-database-source-of-truth-360.mjs || exit /b 1
npx supabase@beta link --project-ref zmbsskvnzjdaxuxlauyx --skip-pooler || exit /b 1
npx supabase@beta db push --dry-run || exit /b 1
pause
npx supabase@beta db push
if errorlevel 1 exit /b 1
echo Database migrations applied successfully.
