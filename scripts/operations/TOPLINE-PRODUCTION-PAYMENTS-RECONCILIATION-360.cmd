@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

node -v
npm -v

npm run verify:payment-webhook-reconciliation-360 || exit /b 1
npm run verify:migration-integrity || exit /b 1
npm run verify:application-security-trust-boundary || exit /b 1
npm run verify:rpc-authorization-certification || exit /b 1
npm run typecheck || exit /b 1
npm run build || exit /b 1

npx supabase db push --linked || exit /b 1
npx supabase functions deploy payment-webhook --no-verify-jwt || exit /b 1

npx supabase db lint --linked || exit /b 1

echo.
echo Payments + Reconciliation + Provider Webhooks 360 gates passed.
endlocal
