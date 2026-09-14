@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
if errorlevel 1 goto FAILED

echo ==========================================================
echo TOPLINE FLOORING - PRODUCTION CLEAN SWEEP
echo ==========================================================
echo.

echo [1/7] Sync main...
git pull --rebase origin main
if errorlevel 1 goto FAILED

echo.
echo [2/7] Vercel configuration gate...
call npm run verify:vercel
if errorlevel 1 goto FAILED

echo.
echo [3/7] Full repository structural verification...
call npm run verify:all
if errorlevel 1 goto FAILED

echo.
echo [4/7] TypeScript...
call npm run typecheck
if errorlevel 1 goto FAILED

echo.
echo [5/7] ESLint...
call npm run lint
if errorlevel 1 goto FAILED

echo.
echo [6/7] Production build...
call npm run build
if errorlevel 1 goto FAILED

echo.
echo [7/7] Commit and push main...
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo No changes detected after verification.
  goto PUSH
)
git commit -m "fix: harden production Vercel deployment routing"
if errorlevel 1 goto FAILED
:PUSH
git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo SUCCESS - PRODUCTION FIX PUSHED TO MAIN
echo ==========================================================
echo.
git log -1 --oneline
git status -sb
echo.
echo Verify the Vercel production deployment before declaring production healthy.
pause
exit /b 0

:FAILED
echo.
echo ==========================================================
echo FAILED - PUSH STOPPED
echo ==========================================================
echo Fix the failing command above. Nothing was pushed after that failure.
pause
exit /b 1
