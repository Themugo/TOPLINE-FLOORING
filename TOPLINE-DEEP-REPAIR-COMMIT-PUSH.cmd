@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
if not exist .git (
  echo ERROR: This is not the TOPLINE Git repository.
  exit /b 1
)

echo ==========================================================
echo TOPLINE DEEP RUNTIME REPAIR - LOCAL VERIFICATION
echo ==========================================================
call npm run lint
if errorlevel 1 goto FAILED
call npm run typecheck
if errorlevel 1 goto FAILED
call npm run build
if errorlevel 1 goto FAILED
node scripts\verify-all.mjs
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo COMMIT + REBASE + PUSH
echo ==========================================================
git status
git add -A
git diff --cached --check
if errorlevel 1 goto FAILED
git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to commit.
  goto PUSH
)
git commit -m "fix: complete deep runtime stability sweep"
if errorlevel 1 goto FAILED
:PUSH
git pull --rebase origin main
if errorlevel 1 goto FAILED
git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo SUCCESS - TOPLINE DEEP REPAIR PUSHED TO MAIN
echo ==========================================================
git log -1 --oneline
git status -sb
pause
exit /b 0

:FAILED
echo.
echo ==========================================================
echo FAILED - NOTHING FURTHER WAS PUSHED BY THIS SCRIPT
echo ==========================================================
echo Review the failing command above, fix it, then rerun.
pause
exit /b 1
