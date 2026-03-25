@echo off
set "LOGFILE=%TEMP%\lock_test_tee.log"
type nul > "%LOGFILE%"
start "" powershell -c "ping -n 5 127.0.0.1 2>&1 | Tee-Object -FilePath '%LOGFILE%'"
ping -n 2 127.0.0.1 >nul
copy /y "%LOGFILE%" "%LOGFILE%.tmp" >nul 2>&1
for /f "usebackq delims=" %%a in ("%LOGFILE%.tmp") do echo read: %%a
