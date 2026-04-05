@echo off
setlocal

:: 🔥 Auto elevate
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb runAs"
    exit /b
)

echo Setting up background updater task...

set "SCRIPT_PATH=%~dp0CheckUpdates.bat"
for %%I in ("%SCRIPT_PATH%") do set "SCRIPT_PATH=%%~fI"

echo Using path:
echo %SCRIPT_PATH%

if not exist "%SCRIPT_PATH%" (
    echo ERROR: checkUpdates.bat not found!
    exit /b 1
)

:: Delete old tasks
schtasks /delete /tn "ComputeAgentUpdater" /f
schtasks /delete /tn "ComputeAgentUpdaterStartup" /f

:: ✅ FIX: Directly run .bat (NO cmd /c)
schtasks /create ^
/tn "ComputeAgentUpdater" ^
/tr "\"%SCRIPT_PATH%\"" ^
/sc minute ^
/mo 15 ^
/rl highest ^
/ru SYSTEM ^
/f

schtasks /create ^
/tn "ComputeAgentUpdaterStartup" ^
/tr "\"%SCRIPT_PATH%\"" ^
/sc onstart ^
/rl highest ^
/ru SYSTEM ^
/f

echo Task Scheduler setup completed!
exit /b