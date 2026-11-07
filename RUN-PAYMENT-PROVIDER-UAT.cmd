@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1
if "%PAYMENT_INITIATE_URL%"=="" echo Set PAYMENT_INITIATE_URL to the isolated sandbox payment-initiate endpoint. & exit /b 2
if "%PAYMENT_UAT_ORDER_ID%"=="" echo Set PAYMENT_UAT_ORDER_ID to a disposable sandbox order UUID. & exit /b 2
if "%PAYMENT_UAT_EMAIL%"=="" echo Set PAYMENT_UAT_EMAIL to the sandbox test email. & exit /b 2
if "%PAYMENT_UAT_PHONE%"=="" echo Set PAYMENT_UAT_PHONE to the sandbox test phone. & exit /b 2
if "%MPESA_UAT_ENV%"=="" echo Set MPESA_UAT_ENV=sandbox or staging. & exit /b 2
if "%MPESA_UAT_EXPECTED_HOST%"=="" echo Set MPESA_UAT_EXPECTED_HOST to the exact sandbox host. & exit /b 2
if not "%MPESA_UAT_ALLOW_MUTATION%"=="true" echo Set MPESA_UAT_ALLOW_MUTATION=true only after confirming the isolated test order. & exit /b 2
call npm run verify:mpesa-provider-uat
exit /b %errorlevel%
