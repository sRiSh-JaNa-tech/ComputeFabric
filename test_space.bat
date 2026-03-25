@echo off
set LOGFILE=%TEMP%\cf_test_space.log 
echo LOGFILE is "%LOGFILE%"
type nul > "%LOGFILE%"
if exist "%LOGFILE%" echo 1. File exists!
for /f "usebackq delims=" %%a in ("%LOGFILE%") do echo read
