@echo off
setlocal

net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb runAs"
    exit /b
)

:: -------------------------------
:: STEP 2: Define Paths
:: -------------------------------
echo [STEP 2] Setting paths...

set BASE_DIR=%~dp0

set SERVICE_NAME=ComputeAgentService

set PYTHON_PATH=%BASE_DIR%Agent\venv\Scripts\python.exe
set SCRIPT_PATH=%BASE_DIR%Agent\src\agent.py
set WORK_DIR=%BASE_DIR%Agent
set LOG_DIR=%BASE_DIR%logs
echo Python Path: %PYTHON_PATH%
echo Script Path: %SCRIPT_PATH%

:: -------------------------------
:: STEP 3: Create Logs Folder
:: -------------------------------
echo [STEP 3] Creating logs folder...

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: -------------------------------
:: STEP 4: Install Service
:: -------------------------------
echo [STEP 4] Installing service...

servy-cli install ^
 --name="%SERVICE_NAME%" ^
 --path="%PYTHON_PATH%" ^
 --startupDir="%WORK_DIR%" ^
 --params="%SCRIPT_PATH%"

:: -------------------------------
:: STEP 5: Configure Logs
:: -------------------------------
echo [STEP 5] Configuring logs...

servy-cli set ^
 --name="%SERVICE_NAME%" ^
 --stdout="%LOG_DIR%\out.log" ^
 --stderr="%LOG_DIR%\err.log"

:: -------------------------------
:: STEP 6: Start Service
:: -------------------------------
echo [STEP 6] Starting service...

servy-cli start --name="%SERVICE_NAME%"

echo ===============================
echo  Service Installed Successfully
echo ===============================