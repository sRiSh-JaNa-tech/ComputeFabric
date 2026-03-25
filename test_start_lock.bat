@echo off
set "LOGFILE=%TEMP%\lock_test_start.log"
type nul > "%LOGFILE%"
start "" cmd /c "ping -n 5 127.0.0.1 > %LOGFILE% 2>&1"
ping -n 2 127.0.0.1 >nul
copy /y "%LOGFILE%" "%TEMP%\lock_test_copy.log" >nul
for /f "usebackq delims=" %%a in ("%TEMP%\lock_test_copy.log") do echo read
