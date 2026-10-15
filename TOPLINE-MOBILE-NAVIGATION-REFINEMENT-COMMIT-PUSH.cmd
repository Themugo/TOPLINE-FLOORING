@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1

echo === TOPLINE mobile navigation refinement ===
echo Repository: %CD%
echo.
echo [1/7] Dedicated mobile navigation verifier
node scripts\verify-mobile-navigation-refinement.mjs
if errorlevel 1 goto :failed

echo.
echo [2/7] Full verifier suite
call npm run verify:all
if errorlevel 1 goto :failed

echo.
echo [3/7] TypeScript
call npm run typecheck
if errorlevel 1 goto :failed

echo.
echo [4/7] Lint
call npm run lint
if errorlevel 1 goto :failed

echo.
echo [5/7] Smoke tests
call npm run test:smoke
if errorlevel 1 goto :failed

echo.
echo [6/7] Production build
call npm run build
if errorlevel 1 goto :failed

echo.
echo [7/7] Whitespace and source diff review
git diff --check
if errorlevel 1 goto :failed

git add src/components/layout/Header.tsx src/index.css scripts/verify-mobile-navigation-refinement.mjs TOPLINE-MOBILE-NAVIGATION-REFINEMENT-AUDIT-2026-10-15.md TOPLINE-MOBILE-NAVIGATION-REFINEMENT-COMMIT-PUSH.cmd
if errorlevel 1 goto :failed

git diff --cached --check
if errorlevel 1 goto :failed

echo.
echo === STAGED CHANGE SUMMARY ===
git diff --cached --stat
echo.
echo Review the staged summary above. The script will commit and push only after your confirmation.
choice /M "Commit and push mobile navigation refinement to origin main"
if errorlevel 2 (
  echo Cancelled. Changes remain staged for review; nothing was committed or pushed.
  exit /b 0
)

git commit -m "fix: refine mobile navigation contrast and touch targets"
if errorlevel 1 goto :failed

git push origin main
if errorlevel 1 goto :failed

echo.
echo === FINAL STATUS ===
git status
git log -1 --oneline
exit /b 0

:failed
echo.
echo ERROR: A verification, build, Git staging, commit, or push step failed.
echo Review the output above. No later steps were attempted after the failure.
exit /b 1
