@echo off
setlocal

echo TOPLINE Contact and Track Order contrast correction

git diff --check
if errorlevel 1 (
  echo ERROR: git diff --check failed. Resolve the reported issues before committing.
  exit /b 1
)

git add src/pages/contact.tsx src/pages/track-order.tsx scripts/verify-track-contact-workflows.mjs scripts/verify-premium-redesign-safety.mjs TOPLINE-CONTACT-TRACK-ORDER-DEEP-AUDIT-2026-10-15.md TOPLINE-CONTACT-TRACK-ORDER-CONTRAST-FIX-COMMIT-PUSH.cmd
if errorlevel 1 exit /b 1

git diff --cached --check
if errorlevel 1 (
  echo ERROR: staged diff check failed. Resolve before committing.
  exit /b 1
)

git commit -m "fix: restore Contact and Track Order hero contrast"
if errorlevel 1 (
  echo ERROR: commit failed. Review Git output before continuing.
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo ERROR: push failed. Review Git output; do not assume remote is updated.
  exit /b 1
)

git status
endlocal
