@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

echo === TOPLINE FINAL HARDENING VERIFICATION ===
npm run verify:project-document-vault
if errorlevel 1 exit /b 1
npm run verify:all
if errorlevel 1 exit /b 1
npm run typecheck
if errorlevel 1 exit /b 1
npm run lint
if errorlevel 1 exit /b 1
npm run build:all
if errorlevel 1 exit /b 1

echo.
echo === GIT STATUS ===
git status

echo.
echo === STAGE ===
git add -A
if errorlevel 1 exit /b 1

echo.
echo === COMMIT ===
git commit -m "Harden project document vault and launch readiness"
if errorlevel 1 exit /b 1

echo.
echo === PUSH ===
git push origin main
if errorlevel 1 (
  echo.
  echo PUSH FAILED. The local commit is still safe. Do not reset or force-push.
  exit /b 1
)

echo.
echo TOPLINE hardening commit pushed successfully.
endlocal
