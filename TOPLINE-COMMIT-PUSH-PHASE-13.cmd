@echo off
cd /d "%~dp0"
node scripts\verify-phase-13-backup-export-360.mjs && node scripts\verify-migration-integrity.mjs && node scripts\verify-phase-12-customer-portal-360.mjs && git add -A && git commit -m "feat: complete phase 13 backup export operations 360" && git push origin main
