@echo off
set "LOGFILE=%TEMP%\cf_test_final.log"
type nul > "%LOGFILE%"
start "" cmd /c "echo http://hello.trycloudflare.com > %LOGFILE% 2>&1"
ping -n 3 127.0.0.1 >nul
for /f "usebackq delims=" %%a in ("%LOGFILE%") do (
    echo Read: %%a
)
