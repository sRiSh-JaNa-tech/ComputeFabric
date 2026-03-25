@echo off
setlocal enabledelayedexpansion
set "LOGFILE=%TEMP%\test_utf16_type.log"
powershell -c "echo 'https://hello.trycloudflare.com' | Tee-Object -FilePath '%LOGFILE%'"
type "%LOGFILE%" > "%LOGFILE%.ansi"
for /f "usebackq delims=" %%a in ("%LOGFILE%.ansi") do (
    set "LINE=%%a"
    if "!LINE:https://=!" neq "!LINE!" (
        echo Found: !LINE!
    ) else (
        echo Not Found!
    )
)
