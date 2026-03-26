@echo off
echo ================================
echo Starting Setup...
echo ================================

REM ---- Agent ----
cd /d %~dp0Agent
py -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt

REM ---- comm_server ----
cd /d %~dp0comm_server
call npm install
call npm run build

REM ---- re_server ----
cd /d %~dp0re_server
call npm install
call npm run build

REM ---- computefabricnotebook ----
cd /d %~dp0computefabricnotebook
py -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt

echo ================================
echo Setup Completed!
echo ================================

pause