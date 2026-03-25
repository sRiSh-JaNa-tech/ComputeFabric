@echo off
cd /d %~dp0

echo ================================
echo Updating specific folder...
echo ================================

:: Set your branch and folder
set BRANCH=main
set FOLDER=agent

:: Enable sparse checkout (safe to run multiple times)
git sparse-checkout init --cone

:: Set the folder you want
git sparse-checkout set %FOLDER%

:: Pull latest changes
git pull origin %BRANCH%

echo ================================
echo Update complete!
echo ================================

pause