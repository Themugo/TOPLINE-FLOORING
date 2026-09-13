@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"

npm run verify:customer-self-service-360 || exit /b 1
npm run verify:migration-integrity || exit /b 1
npm run typecheck || exit /b 1
npm run build || exit /b 1
npx supabase db push --linked || exit /b 1

echo Customer Self-Service Experience 360 deployment gate passed.
endlocal
