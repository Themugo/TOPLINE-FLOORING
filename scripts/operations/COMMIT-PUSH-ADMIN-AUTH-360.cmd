@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
if errorlevel 1 goto FAILED

echo ==========================================================
echo TOPLINE FLOORING - ADMIN AUTHENTICATION & AUTHORIZATION 360
echo ==========================================================
echo.

echo [1/7] Admin Authentication & Authorization 360 verification...
call npm run verify:admin-auth-360
if errorlevel 1 goto FAILED

echo.
echo [2/7] DB-9 through DB-11 verification...
call npm run verify:db-9-11
if errorlevel 1 goto FAILED

echo.
echo [3/7] Migration deployment static verification...
node scripts\verify-migration-deployment-static.mjs
if errorlevel 1 goto FAILED

echo.
echo [4/7] Full structural verification...
call node scripts\verify-all.mjs
if errorlevel 1 goto FAILED

echo.
echo [5/7] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [6/7] ESLint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [7/7] Production build + commit + push...
call npm run build
if errorlevel 1 goto FAILED

git status -sb
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes detected. Nothing to commit.
  goto PUSH
)
git commit -m "feat: harden admin authentication and authorization 360"
if errorlevel 1 goto FAILED
:PUSH
git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo SUCCESS - ADMIN AUTHENTICATION & AUTHORIZATION 360 PUSHED
echo ==========================================================
git log -1 --oneline
git status -sb
echo.
echo IMPORTANT: Real Admin account UAT and production Supabase Auth URL configuration remain external gates.
pause
exit /b 0

:FAILED
echo.
echo ==========================================================
echo FAILED - PUSH STOPPED
 echo ==========================================================
echo Fix the failing command above, then rerun this script.
pause
exit /b 1
