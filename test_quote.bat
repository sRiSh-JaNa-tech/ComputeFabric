@echo off
set "LOGFILE=%TEMP%\cf_test_new.log"
del "%LOGFILE%" 2>nul
echo Creating file
type nul > "%LOGFILE%"
if exist "%LOGFILE%" echo 1. File exists!
start "" cmd /k "echo TEST > "%LOGFILE%" 2>&1"
timeout /t 2 /nobreak >nul
if exist "%LOGFILE%" echo 2. File exists!
for /f "usebackq" %%a in ("%LOGFILE%") do echo read
