@echo off
cd /d "%~dp0"
node scripts/verify-phase-12-customer-portal-360.mjs && node scripts/verify-migration-integrity.mjs && node scripts/verify-phase-9-11.mjs && node scripts/verify-phase-10-finance-billing-360.mjs && node scripts/verify-phase-8-field-operations.mjs && git add -A && git commit -m "feat: complete phase 12 customer portal 360" && git push origin main
