@echo off
cd /d "%~dp0"

set AGENT_DIR=%~dp0Agent

if not exist "%AGENT_DIR%" (
    echo Agent folder not found!
    exit /b 1
)

cd /d "%AGENT_DIR%"

git fetch >nul 2>&1

git diff --quiet HEAD origin/main

if %errorlevel%==0 (
    echo Up to date
) else (
    echo Updating...

    git fetch
    git reset --hard origin/main
    git clean -fd

    echo Update complete!
)