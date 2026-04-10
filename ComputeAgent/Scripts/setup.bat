@echo off
setlocal

echo ===============================
echo   ComputeAgent Setup Started
echo ===============================

cd /d "%~dp0"

:: -------------------------------
echo [STEP 1] Installing Git...
call gitinstaller.bat
if %errorlevel% neq 0 (
    echo Git installation failed!
    exit /b 1
)

:: -------------------------------
echo [STEP 3] Setting up Git Repo...
call SetGit.bat
if %errorlevel% neq 0 (
    echo Git setup failed!
    exit /b 1
)

:: -------------------------------
echo [STEP 2] Installing Python...
call pyinstaller.bat
if %errorlevel% neq 0 (
    echo Python installation failed!
    exit /b 1
)

echo Installing Cloudflare Tunnel...
call cf_ins.bat
if %errorlevel% neq 0 (
    echo Cloudflare Tunnel installation failed!
    exit /b 1
)

:: -------------------------------
echo [STEP 5] Setting up Scheduler...
call sch.bat
if %errorlevel% neq 0 (
    echo Scheduler setup failed!
    exit /b 1
)

echo [STEP 6] Setting up Scheduler...
call Sins.bat
if %errorlevel% neq 0 (
    echo Scheduler setup failed!
    exit /b 1
)

echo [STEP 7] Setting up Scheduler...
call RS.bat
if %errorlevel% neq 0 (
    echo Scheduler setup failed!
    exit /b 1
)

echo ===============================
echo   Setup Completed Successfully
echo ===============================

exit /b 0