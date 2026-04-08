@echo off
title Eventry Bot
cd /d "%~dp0"

echo ========================================
echo  Eventry Bot Setup
echo ========================================
echo.

if not exist "venv" (
    echo [1/3] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create venv. Is Python installed and on PATH?
        pause
        exit /b 1
    )
) else (
    echo [1/3] Virtual environment already exists, skipping.
)

echo.
echo [2/3] Activating venv and upgrading pip...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip --disable-pip-version-check

echo.
echo [3/3] Installing dependencies (this can take 1-3 minutes)...
pip install -r requirements.txt --disable-pip-version-check
if errorlevel 1 (
    echo [ERROR] Dependency install failed.
    pause
    exit /b 1
)

:start
echo.
echo ========================================
echo  [BOT] Starting Eventry Bot...
echo ========================================
echo.
python main.py

echo.
echo [BOT] Bot stopped. Restarting in 5 seconds... (Ctrl+C to exit)
timeout /t 5 /nobreak >nul
goto start
