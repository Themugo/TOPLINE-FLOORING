@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
if errorlevel 1 goto FAILED

echo ==========================================================
echo TOPLINE FLOORING - DB-01 THROUGH DB-11 FINAL COMMIT
echo ==========================================================
echo.

echo [1/6] Repository DB-9--11 verification...
call npm run verify:db-9-11
if errorlevel 1 goto FAILED

echo.
echo [2/6] Full structural verification...
call node scripts\verify-all.mjs
if errorlevel 1 goto FAILED

echo.
echo [3/6] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [4/6] ESLint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [5/6] Production build...
call npm run build
if errorlevel 1 goto FAILED

echo.
echo [6/6] Git commit and push...
git status --short
git add .
git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes detected. Nothing to commit.
  goto PUSH
)
git commit -m "chore: complete DB-01 through DB-11 hardening"
if errorlevel 1 goto FAILED
:PUSH
git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo SUCCESS - DB-01 THROUGH DB-11 PUSHED TO MAIN
echo ==========================================================
git log -1 --oneline
git status -sb
echo.
echo IMPORTANT: Production Vercel/DNS/Auth/provider activation and business UAT remain external gates.
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
