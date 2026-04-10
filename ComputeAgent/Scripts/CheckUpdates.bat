@echo off
cd /d "%~dp0"

set AGENT_DIR=%~dp0Agent
set SERVICE_NAME=ComputeAgentService

if not exist "%AGENT_DIR%" (
    echo Agent folder not found!
    exit /b 1
)

cd /d "%AGENT_DIR%"

echo [STEP 1] Checking updates...
git fetch >nul 2>&1

git diff --quiet HEAD origin/main

if %errorlevel%==0 (
    echo Up to date
    exit /b
)

echo Update found!

echo Stopping service...
net stop %SERVICE_NAME% >nul 2>&1

:: -------------------------------
:: STEP 3: UPDATE CODE
:: -------------------------------
echo Updating...

git reset --hard origin/main
git clean -fd

echo Update complete!

echo Starting service...
net start %SERVICE_NAME% >nul 2>&1

echo Service restarted successfully!
pause
exit /b