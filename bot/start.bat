@echo off
title Eventry Bot
cd /d "%~dp0"

if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
)

echo [SETUP] Installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

:start
echo.
echo [BOT] Starting Eventry Bot...
echo.
python main.py

echo.
echo [BOT] Bot stopped. Restarting in 5 seconds... (Ctrl+C to exit)
timeout /t 5 /nobreak >nul
goto start
