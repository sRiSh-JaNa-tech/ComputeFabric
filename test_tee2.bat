@echo off
set "LOGFILE=%TEMP%\test_utf8.log"
powershell -c "echo 'https://hello.trycloudflare.com' | Tee-Object -FilePath '%LOGFILE%' -Encoding UTF8"
for /f "usebackq delims=" %%a in ("%LOGFILE%") do (
    set "LINE=%%a"
    if "!LINE:https://=!" neq "!LINE!" (
        echo Found: !LINE!
    ) else (
        echo Not Found!
    )
)
