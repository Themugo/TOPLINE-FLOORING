@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

echo === Topline Application Security & Trust Boundary 360 ===
call npm ci
if errorlevel 1 exit /b 1

call npm run verify:migration-deployment-static
if errorlevel 1 exit /b 1
call npm run verify:application-security-trust-boundary
if errorlevel 1 exit /b 1
call npm run typecheck
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1

npx supabase db push --linked
if errorlevel 1 exit /b 1

npx supabase db lint --linked
if errorlevel 1 exit /b 1

git status
git add .
git commit -m "Harden application security and trust boundaries"
git push origin main
endlocal
