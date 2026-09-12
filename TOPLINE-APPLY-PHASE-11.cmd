@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo TOPLINE FLOORING - APPLY PHASE 11
echo Inventory & Procurement Operations 360
echo ============================================================

if not exist "supabase\migrations\20260912140000_063_inventory_procurement_operations_360.sql" (
  echo ERROR: Phase 11 migration file is missing.
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$p='package.json'; $j=Get-Content $p -Raw | ConvertFrom-Json; if(-not $j.scripts.'verify:phase-11-inventory-procurement-360'){ $j.scripts | Add-Member -NotePropertyName 'verify:phase-11-inventory-procurement-360' -NotePropertyValue 'node scripts/verify-phase-11-inventory-procurement-360.mjs'; }; $j | ConvertTo-Json -Depth 20 | Set-Content $p"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$p='src/App.tsx'; $s=Get-Content $p -Raw; if($s -notmatch 'inventory-procurement-operations'){ $s=$s -replace ""const AdminFinanceOperations = lazy\(\(\) => import\('@/pages/admin/finance-operations'\)\);"", ""const AdminFinanceOperations = lazy(() => import('@/pages/admin/finance-operations'));`r`nconst AdminInventoryProcurementOperations = lazy(() => import('@/pages/admin/inventory-procurement-operations'));""); $s=$s -replace ""'/admin/finance-operations': AdminFinanceOperations,"", ""'/admin/finance-operations': AdminFinanceOperations,`r`n    '/admin/inventory-procurement-operations': AdminInventoryProcurementOperations,""; Set-Content $p $s }"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$p='src/pages/admin/operations-command-center.tsx'; $s=Get-Content $p -Raw; if($s -notmatch 'inventory-procurement-operations'){ $needle=""<div className=\""mt-6 bg-gray-50 border border-gray-200 rounded-xl p-6\"">""; $insert=""<div className=\""mt-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-6\""><div><h2 className=\""font-semibold text-navy-900\"">Inventory & Procurement 360</h2><p className=\""text-sm text-gray-600 mt-1\"">Control supplier commitments, receipts, stock pressure and reconciliation.</p></div><Link href=\""/admin/inventory-procurement-operations\"" className=\""shrink-0 text-sm text-primary-700 font-medium\"">Open workspace →</Link></div><div className=\""mt-6 bg-gray-50 border border-gray-200 rounded-xl p-6\"">""; $s=$s.Replace($needle,$insert); Set-Content $p $s }"

echo.
echo Phase 11 files applied to the current repository.
echo Run: npm run verify:phase-11-inventory-procurement-360
echo Then review git diff before committing.
exit /b 0
