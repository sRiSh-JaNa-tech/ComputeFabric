@echo off
setlocal enabledelayedexpansion

echo =================================
echo Starting Tunnel and Registering...
echo =================================

:: CONFIG
set PORT=5380
set API_URL=https://computefabric.onrender.com/register
set SERVER_ID=Capybara_34
set SERVER_NAME=JBOT_heart

:: Retry control
set MAX_RETRIES=30
set RETRY_COUNT=0

:: Log file
set "LOGFILE=%TEMP%\cf_%RANDOM%.log"
type nul > "%LOGFILE%"

:: Start tunnel
start "" powershell -c "cloudflared tunnel --url http://localhost:%PORT% 2>&1 | Tee-Object -FilePath '%LOGFILE%'"

echo Waiting for tunnel URL...

set TUNNEL_URL=

:loop
timeout /t 2 >nul
set /a RETRY_COUNT+=1

:: Stop if too many retries
if %RETRY_COUNT% GEQ %MAX_RETRIES% (
    echo.
    echo ❌ ERROR: Timeout waiting for tunnel URL
    goto fail
)

:: Check if process still running
tasklist | find /i "cloudflared.exe" >nul
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: cloudflared process stopped unexpectedly
    goto fail
)

:: Read log safely
copy /y "%LOGFILE%" "%LOGFILE%.tmp" >nul 2>&1
type "%LOGFILE%.tmp" > "%LOGFILE%.ansi" 2>nul
for /f "usebackq delims=" %%a in ("%LOGFILE%.ansi") do (
    set "LINE=%%a"
    if "!LINE:https://=!" neq "!LINE!" (
        if "!LINE:trycloudflare.com=!" neq "!LINE!" (
            set "TUNNEL_URL=!LINE!"
        )
    )
)

if not defined TUNNEL_URL goto loop

:: Extract clean URL
set "TUNNEL_URL=!TUNNEL_URL:*https://=!"
set "TUNNEL_URL=https://!TUNNEL_URL!"
set "TUNNEL_URL=!TUNNEL_URL:|=!"
set "TUNNEL_URL=!TUNNEL_URL: =!"

echo.
echo ✅ Tunnel URL Found: %TUNNEL_URL%

:: Encode URL
set "TUNNEL_NAME=!TUNNEL_URL::=%%3A!"
set "TUNNEL_NAME=!TUNNEL_NAME:/=%%2F!"

echo Encoded URL: %TUNNEL_NAME%

:: Send API request
echo Sending to API...

curl -X PUT "%API_URL%/%SERVER_ID%/%SERVER_NAME%/%TUNNEL_NAME%"

if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to call API
    goto fail
)

echo.
echo ✅ Done successfully!
pause
exit /b

:fail
echo.
echo ❌ Script failed.
pause
exit /b 1