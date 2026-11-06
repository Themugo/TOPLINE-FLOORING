@echo off
setlocal
cd /d "%~dp0"
echo.
echo TOPLINE SERVICES + UPLOAD + INSTALLATION END-TO-END TEST
 echo.
if not exist node_modules (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run typecheck
if errorlevel 1 exit /b 1
call npm run build:all
if errorlevel 1 exit /b 1
call npm run test:e2e:services-installation
exit /b %errorlevel%
