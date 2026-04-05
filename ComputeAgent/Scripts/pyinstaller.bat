@echo off
setlocal

echo [STEP 1] Checking Python...

py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found. Installing...

    winget install Python.Python.3.14 --silent --accept-source-agreements --accept-package-agreements

    echo Refreshing PATH...

    set "PY_PATH=%LOCALAPPDATA%\Programs\Python\Python314"
    set "PATH=%PATH%;%PY_PATH%;%PY_PATH%\Scripts"
) else (
    echo Python already installed
)

echo [STEP 2] Setting up virtual environment...
call :venvInstall
echo Done!
exit /b


:: =========================
:venvInstall

:: Go to Agent folder
set AGENT_DIR=%~dp0Agent

if not exist "%AGENT_DIR%" (
    echo Agent folder not found!
    exit /b 1
)

cd /d "%AGENT_DIR%"

echo [STEP 3] Creating virtual environment...

:: Create only if not exists (IMPORTANT)
if not exist "venv" (
    py -m venv venv
) else (
    echo venv already exists
)

echo [STEP 4] Activating venv...
call venv\Scripts\activate

echo [STEP 5] Installing dependencies...

if exist requirements.txt (
    pip install -r requirements.txt
) else (
    echo requirements.txt not found!
)
exit /b