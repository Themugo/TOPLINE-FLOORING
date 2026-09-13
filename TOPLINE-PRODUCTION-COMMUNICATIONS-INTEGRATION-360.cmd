@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

echo === TOPLINE PRODUCTION COMMUNICATIONS INTEGRATION 360 ===
node -v
npm -v

echo.
echo [1/7] Static migration verification
npm run verify:migration-deployment-static || exit /b 1

echo.
echo [2/7] Application security verification
npm run verify:application-security-trust-boundary || exit /b 1

echo.
echo [3/7] RPC authorization verification
npm run verify:rpc-authorization-certification || exit /b 1

echo.
echo [4/7] Communications integration verification
npm run verify:production-communications-integration-360 || exit /b 1

echo.
echo [5/7] Migration integrity verification
npm run verify:migration-integrity || exit /b 1

echo.
echo [6/7] Application typecheck/build
npm run typecheck || exit /b 1
npm run build || exit /b 1

echo.
echo [7/7] Deploy database and Edge Functions
npx supabase db push --linked || exit /b 1
npx supabase functions deploy deliver-communications || exit /b 1
npx supabase functions deploy communication-provider-webhook || exit /b 1
npx supabase functions deploy sms-delivery-report || exit /b 1
npx supabase functions deploy sms-inbound || exit /b 1
npx supabase functions deploy email-inbound || exit /b 1
npx supabase functions deploy whatsapp-webhook || exit /b 1

echo.
echo All production communications gates passed.
endlocal
