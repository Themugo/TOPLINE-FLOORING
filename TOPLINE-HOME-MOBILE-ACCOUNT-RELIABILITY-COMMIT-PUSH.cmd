@echo off
setlocal EnableExtensions
for %%I in ("%CD%") do set "ROOT=%%~fI"
echo === TOPLINE home, mobile navigation and customer account reliability ===
echo Repository: "%ROOT%"
if not exist "%ROOT%\package.json" (
  echo ERROR: package.json not found. Run this script from the existing TOPLINE repository root.
  exit /b 1
)
node scripts\verify-home-mobile-account-reliability.mjs || exit /b 1
node scripts\verify-premium-redesign-safety.mjs || exit /b 1
node scripts\verify-track-contact-workflows.mjs || exit /b 1
node scripts\verify-all.mjs || exit /b 1
call npm run typecheck || exit /b 1
call npm run lint || exit /b 1
call npm run test:smoke || exit /b 1
call npm run build || exit /b 1
git diff --check || exit /b 1
echo.
echo === Staging only intended files ===
git add src/pages/home.tsx src/components/layout/Header.tsx src/components/layout/MobileActionBar.tsx src/pages/shop.tsx src/pages/portal.tsx scripts/verify-home-mobile-account-reliability.mjs supabase/migrations/20261015140000_reconcile_existing_verified_customer_portal_links.sql supabase/MIGRATION_MANIFEST.md TOPLINE-HOME-MOBILE-ACCOUNT-RELIABILITY-AUDIT-2026-10-15.md TOPLINE-HOME-MOBILE-ACCOUNT-RELIABILITY-COMMIT-PUSH.cmd || exit /b 1
git diff --cached --check || exit /b 1
git diff --cached --stat || exit /b 1
echo.
echo Review the staged summary above. Press Ctrl+C to abort, or press any key to commit and push.
pause >nul
git commit -m "fix: stabilize homepage hero, mobile navigation and customer portal" || exit /b 1
git push origin main || exit /b 1
echo.
git status
git log -1 --oneline
endlocal
