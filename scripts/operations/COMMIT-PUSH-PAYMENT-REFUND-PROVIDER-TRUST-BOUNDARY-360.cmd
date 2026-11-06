@echo off
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
if errorlevel 1 exit /b 1
git status --short
git add -A
git commit -m "feat: harden payment refund provider trust boundary 360"
if errorlevel 1 exit /b 1
git push origin main
