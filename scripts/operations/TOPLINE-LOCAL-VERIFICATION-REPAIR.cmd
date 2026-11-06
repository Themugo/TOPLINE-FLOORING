@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

echo === Topline local verification repair ===
node -v
npm -v

echo.
echo [1/6] Static migration verification
npm run verify:migration-deployment-static || exit /b 1

echo.
echo [2/6] Application security verification
npm run verify:application-security-trust-boundary || exit /b 1

echo.
echo [3/6] RPC authorization verification
npm run verify:rpc-authorization-certification || exit /b 1

echo.
echo [4/6] TypeScript verification
npm run typecheck || exit /b 1

echo.
echo [5/6] Production build
npm run build || exit /b 1

echo.
echo [6/6] Supabase deployment/lint
npx supabase db push --linked || exit /b 1
npx supabase db lint --linked || exit /b 1

echo.
echo All verification gates passed.
endlocal
