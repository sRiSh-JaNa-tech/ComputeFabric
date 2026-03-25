@echo off
set "LOGFILE=%TEMP%\cf_%RANDOM%.log"
echo Creating %LOGFILE%
type nul > "%LOGFILE%"
if exist "%LOGFILE%" echo File exists after type nul!
start "" cmd /c "echo hello > "%LOGFILE%" 2>&1"
timeout /t 2 /nobreak >nul
if exist "%LOGFILE%" echo File exists after start!
for /f "usebackq delims=" %%a in ("%LOGFILE%") do (
    echo Read: %%a
)
