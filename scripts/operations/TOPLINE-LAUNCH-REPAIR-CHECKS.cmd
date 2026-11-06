@echo off
setlocal
cd /d "%~dp0"

echo === TOPLINE Launch Repair Checks ===
call npm run verify:launch-repair || exit /b 1
call npm run verify:migration-integrity || exit /b 1
call npm run verify:schema-contract || exit /b 1
call npm run verify:brevo-email || exit /b 1
call npm run typecheck || exit /b 1
call npm run build:all || exit /b 1
call npm run lint || exit /b 1

echo.
echo ALL LOCAL LAUNCH REPAIR CHECKS PASSED.
exit /b 0
