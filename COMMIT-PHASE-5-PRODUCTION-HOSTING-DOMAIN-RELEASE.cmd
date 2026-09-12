@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo TOPLINE FLOORING - PHASE 5 PRODUCTION HOSTING + DOMAIN RELEASE
echo ==========================================================
echo.

echo [1/8] Phase 5 hosting/release verification...
call node scripts\verify-phase-5-hosting.mjs
if errorlevel 1 goto FAILED

echo.
echo [2/8] Vercel deployment contract...
call node scripts\verify-vercel-deployment.mjs
if errorlevel 1 goto FAILED

echo.
echo [3/8] Supabase production infrastructure contract...
call node scripts\verify-phase-2-supabase.mjs
if errorlevel 1 goto FAILED

echo.
echo [4/8] Production email contract...
call node scripts\verify-phase-3-email.mjs
if errorlevel 1 goto FAILED

echo.
echo [5/8] SMS/customer notification contract...
call node scripts\verify-phase-4-sms.mjs
if errorlevel 1 goto FAILED

echo.
echo [6/8] Migration integrity...
call node scripts\verify-migration-integrity.mjs
if errorlevel 1 goto FAILED

echo.
echo [7/8] Release candidate gate...
call node scripts\verify-release-candidate.mjs
if errorlevel 1 goto FAILED

echo.
echo [8/8] Git status...
git status --short

echo.
echo ==========================================================
echo COMMITTING PHASE 5
echo ==========================================================
echo.
git add .
git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes detected. Nothing to commit.
  goto PUSH
)
git commit -m "feat: prepare production hosting and domain release"
if errorlevel 1 goto FAILED

:PUSH
echo.
echo Pushing main...
git push origin main
if errorlevel 1 goto FAILED

echo.
echo ==========================================================
echo SUCCESS - PHASE 5 PUSHED TO MAIN
echo ==========================================================
echo.
git log -1 --oneline
git status -sb
echo.
echo IMPORTANT: Vercel, DNS, Supabase Auth URLs, and provider activation
echo remain external launch gates and are NOT claimed complete by this script.
echo.
pause
goto END

:FAILED
echo.
echo ==========================================================
echo FAILED - NOTHING FURTHER WAS PUSHED BY THIS SCRIPT
echo ==========================================================
echo.
echo Fix the failing command shown above before retrying.
echo.
pause

:END
endlocal
