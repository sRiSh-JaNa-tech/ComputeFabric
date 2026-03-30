@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs -WindowStyle Hidden"
    exit /b
)
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -like '*agent.py*') -or ($_.CommandLine -like '*auto_updater.bat*') -or ($_.CommandLine -like '*run_s.vbs*') } | Stop-Process -Force"
