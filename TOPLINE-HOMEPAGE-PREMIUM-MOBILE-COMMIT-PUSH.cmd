@echo off
setlocal
cd /d "%~dp0"

echo === TOPLINE homepage premium/mobile verification ===
node scripts\verify-homepage-premium-mobile.mjs
if errorlevel 1 goto :failed
node scripts\verify-premium-redesign-safety.mjs
if errorlevel 1 goto :failed
node scripts\verify-track-contact-workflows.mjs
if errorlevel 1 goto :failed
npm run verify:all
if errorlevel 1 goto :failed
npm run typecheck
if errorlevel 1 goto :failed
npm run lint
if errorlevel 1 goto :failed
npm run test:smoke
if errorlevel 1 goto :failed
npm run build
if errorlevel 1 goto :failed

git diff --check
if errorlevel 1 goto :failed

echo === Review staged target files ===
git add src\pages\home.tsx src\index.css scripts\verify-homepage-premium-mobile.mjs TOPLINE-HOMEPAGE-PREMIUM-MOBILE-AUDIT-2026-10-15.md TOPLINE-HOMEPAGE-PREMIUM-MOBILE-COMMIT-PUSH.cmd
if errorlevel 1 goto :failed
git diff --cached --check
if errorlevel 1 goto :failed
git diff --cached --stat

echo.
echo Review the staged diff above. Press Ctrl+C to abort or
pause

git commit -m "feat: polish homepage carousel and mobile experience"
if errorlevel 1 goto :failed
git push origin main
if errorlevel 1 goto :failed
git status
git log -1 --oneline
echo.
echo SUCCESS: homepage changes committed and pushed.
exit /b 0

:failed
echo.
echo STOPPED: a verification or Git step failed. Review output before retrying.
exit /b 1
