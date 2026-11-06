@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo TOPLINE EMAIL, REGISTRATION AND COMMUNICATIONS VERIFICATION
echo ============================================================
echo.
call npm run verify:email-registration-communications
if errorlevel 1 goto failed
call npm run verify:brevo-email
if errorlevel 1 goto failed
node scripts/verify-delivery-worker-hardening.mjs
if errorlevel 1 goto failed
node scripts/verify-production-communications-integration-360.mjs
if errorlevel 1 goto failed
node scripts/verify-communications-comm-10-12.mjs
if errorlevel 1 goto failed
call npm run test:smoke
if errorlevel 1 goto failed
call npm run typecheck
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo.
echo ALL LOCAL EMAIL/REGISTRATION/COMMUNICATIONS CHECKS PASSED.
echo Live Brevo and Supabase Auth delivery still require the runbook UAT.
pause
exit /b 0
:failed
echo.
echo VERIFICATION FAILED. Review the first failing command above.
pause
exit /b 1
