@echo off
setlocal
cd /d "%~dp0"
echo TOPLINE FLOORING & ROOFING - Claude Code handoff checks
echo.
echo 1. Verify repository state
 git status
 echo.
echo 2. Run complete static verification
call npm run verify:all
if errorlevel 1 goto :fail
echo.
echo 3. Typecheck
call npm run typecheck
if errorlevel 1 goto :fail
echo.
echo 4. Lint
call npm run lint
if errorlevel 1 goto :fail
echo.
echo 5. Full build
call npm run build:all
if errorlevel 1 goto :fail
echo.
echo ALL LOCAL HANDOFF CHECKS PASSED.
exit /b 0
:fail
echo.
echo HANDOFF CHECK FAILED. Fix the reported issue before committing.
exit /b 1
