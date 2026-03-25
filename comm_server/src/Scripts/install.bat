@echo off
echo ================================
echo Installing Cloudflare Tunnel...
echo ================================

:: Step 1: Create a directory
set INSTALL_DIR=%ProgramFiles%\cloudflared
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

:: Step 2: Download cloudflared
echo Downloading cloudflared...
powershell -Command "Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile %INSTALL_DIR%\cloudflared.exe"

:: Step 3: Add to PATH
echo Adding to system PATH...
setx PATH "%PATH%;%INSTALL_DIR%" /M

:: Step 4: Verify installation
echo.
echo Verifying installation...
"%INSTALL_DIR%\cloudflared.exe" --version

echo.
echo ================================
echo Installation Complete!
echo Restart your terminal to use cloudflared globally.
echo ================================
pause