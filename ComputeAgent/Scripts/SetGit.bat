@echo off
setlocal
set BASE_DIR=%~dp0
set AGENT_DIR=%BASE_DIR%\Agent

if not exist "%AGENT_DIR%" (
    mkdir "%AGENT_DIR%"
    echo Created Agent folder
) else (
    echo Agent folder already exists
)

cd /d "%AGENT_DIR%"

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed. Please install Git first.
    exit /b 1
)

if not exist ".git" (
    git init
    echo Git initialized
) else (
    echo Git already initialized
)

set REPO_URL="https://github.com/sRiSh-JaNa-tech/ComputeAgents.git"

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

git branch -M main
git pull origin main

if %errorlevel% neq 0 (
    echo Failed to pull repository!
    exit /b 1
)

echo Setup completed successfully!
exit /b