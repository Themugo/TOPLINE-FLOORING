@echo off
setlocal
cd /d "%~dp0"

echo === TOPLINE Brand and Navigation Verification ===
node scripts\verify-brand-navigation.mjs
if errorlevel 1 goto :failed

echo.
echo === Whitespace validation ===
git diff --check
if errorlevel 1 goto :failed

echo.
echo === Stage intended brand/navigation files only ===
git add src/components/layout/Header.tsx public/topline-brand-mark.svg scripts/verify-brand-navigation.mjs TOPLINE-BRAND-AND-NAVIGATION-POLISH-2026-10-15.md TOPLINE-BRAND-AND-NAVIGATION-COMMIT-PUSH.cmd
if errorlevel 1 goto :failed

git diff --cached --check
if errorlevel 1 goto :failed

git diff --cached --stat

echo.
echo Review the staged file summary above. Press Ctrl+C to cancel, or
pause

git commit -m "feat: protect Topline brand identity and polish navigation"
if errorlevel 1 goto :failed

git push origin main
if errorlevel 1 goto :failed

echo.
echo === Final repository status ===
git status
git log -1 --oneline
exit /b 0

:failed
echo.
echo FAILED. No further actions were run after the failing command. Review output before retrying.
exit /b 1
