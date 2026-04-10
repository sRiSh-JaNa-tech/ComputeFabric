@echo off
setlocal enabledelayedexpansion

:: ================================
:: CONFIG
:: ================================
set "INSTALL_DIR=%LOCALAPPDATA%\cloudflared"
set "EXE_PATH=%INSTALL_DIR%\cloudflared.exe"

echo ==================================================
echo Cloudflared Installation Script
echo ==================================================
echo Install directory: %INSTALL_DIR%

:: ================================
:: STEP 0: Check existing install
:: ================================
if exist "%EXE_PATH%" (
    echo Found existing installation. Verifying...

    "%EXE_PATH%" --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Cloudflared already installed and working.
        "%EXE_PATH%" --version
        goto :EOF
    ) else (
        echo Existing file is corrupted. Deleting...
        del "%EXE_PATH%"
    )
)

:: ================================
:: STEP 1: Create directory
:: ================================
echo Creating installation directory...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create directory.
        exit /b 1
    )
)

:: ================================
:: STEP 2: Download (PowerShell)
:: ================================
echo Downloading cloudflared using PowerShell...

powershell -Command ^
"[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
try { ^
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile ""%EXE_PATH%"" -UseBasicParsing -ErrorAction Stop ^
} catch { exit 1 }"

:: ================================
:: STEP 3: Fallback to curl
:: ================================
if not exist "%EXE_PATH%" (
    echo PowerShell download failed. Trying curl...

    curl -L -o "%EXE_PATH%" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

    if not exist "%EXE_PATH%" (
        echo ERROR: Download failed completely.
        exit /b 1
    )
)

echo Download completed.

:: ================================
:: STEP 4: Verify binary
:: ================================
echo Verifying installation...

"%EXE_PATH%" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Downloaded file is invalid or corrupted.
    del "%EXE_PATH%"
    exit /b 1
)

echo Verification successful:
"%EXE_PATH%" --version

:: ================================
:: STEP 5: Add to PATH (user only)
:: ================================
echo Checking PATH...

echo %PATH% | find /I "%INSTALL_DIR%" >nul
if %errorlevel% neq 0 (
    echo Adding to user PATH...
    setx PATH "%PATH%;%INSTALL_DIR%" >nul 2>&1

    if %errorlevel% neq 0 (
        echo WARNING: Failed to update PATH.
    ) else (
        echo PATH updated successfully.
    )
) else (
    echo PATH already contains cloudflared.
)

:: ================================
:: DONE
:: ================================
echo.
echo ============================================
echo Installation completed successfully!
echo ============================================

exit /b 0