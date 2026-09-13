@echo off
setlocal
cd /d "C:\Users\hp\Desktop\TOPLINE FLOORING & ROOFING"
git status
git add .
git commit -m "feat: production automation and worker control 360"
git push origin main
git status
git log -1 --oneline
endlocal
