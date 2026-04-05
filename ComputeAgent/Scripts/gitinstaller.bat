@echo off
setlocal

echo [STEP 1] Checking Git...

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git not found. Installing...

    call :install_git
) else (
    echo Git already installed
)

echo Done!
exit /b


:: =========================
:install_git

echo Installing Git using winget...

winget install Git.Git --silent --accept-source-agreements --accept-package-agreements

if %errorlevel% neq 0 (
    echo Winget install failed. Trying manual install...

    call :install_git_manual
    exit /b
)

echo Refreshing PATH...

set "GIT_PATH=C:\Program Files\Git\bin"
set "PATH=%PATH%;%GIT_PATH%"

git --version
if errorlevel 1 (
    echo Git installation failed!
    exit /b 1
)

echo Git installed successfully!
exit /b


:: =========================
:install_git_manual

echo Downloading Git installer...

set GIT_URL=https://github.com/git-for-windows/git/releases/latest/download/Git-2.45.1-64-bit.exe
set INSTALLER=git_installer.exe

powershell -Command "Invoke-WebRequest -Uri %GIT_URL% -OutFile %INSTALLER%"

if not exist %INSTALLER% (
    echo Download failed!
    exit /b 1
)

echo Running installer...

%INSTALLER% /VERYSILENT /NORESTART

echo Cleaning up...
del %INSTALLER%

exit /b