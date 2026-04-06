@echo off
setlocal

echo ===============================
echo   ComputeAgent Service Setup
echo ===============================


echo [STEP 1] Checking Servy...

servy-cli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Servy not found or not usable. Installing...
    call :install_servy
) else (
    echo Servy already installed
)

echo [STEP 2] Fixing Event Log...

powershell -Command "New-EventLog -LogName Application -Source Servy" 2>nul

echo [STEP 3] Verifying Servy CLI...

set SERVY_PATH="C:\Program Files\Servy\servy-cli.exe"

if exist %SERVY_PATH% (
    echo Servy CLI found at %SERVY_PATH%
) else (
    echo ERROR: Servy CLI not found!
    pause
    exit /b 1
)

echo ===============================
echo   Servy Installed Successfully
echo ===============================
exit /b


:install_servy
winget install -e --id aelassas.Servy --silent --accept-source-agreements --accept-package-agreements
echo Waiting for installation to complete...
timeout /t 8 >nul

exit /b