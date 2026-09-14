@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
if errorlevel 1 exit /b 1
if "%PAYMENT_WEBHOOK_URL%"=="" echo Set PAYMENT_WEBHOOK_URL first. & exit /b 1
if "%PAYMENT_WEBHOOK_SECRET%"=="" echo Set PAYMENT_WEBHOOK_SECRET first. & exit /b 1
if "%PAYMENT_UAT_ORDER_ID%"=="" echo Set PAYMENT_UAT_ORDER_ID first. & exit /b 1
set PAYMENT_PROVIDER=%PAYMENT_PROVIDER:~0,80%
set PAYMENT_UAT_ALLOW_MUTATION=true
node scripts\verify-payment-provider-uat.mjs
