@echo off
title Sowa AI Desktop Launcher
cd /d "%~dp0"

echo ===================================================
echo              Starting Sowa AI Desktop              
echo ===================================================

:: Check if server is running on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting Sowa AI background server...
    start /b npm run dev >nul 2>&1
    timeout /t 3 /nobreak >nul
)

:: Try opening in Microsoft Edge App Mode
start msedge --app="http://localhost:3000" --window-size=1280,800

:: Fallback to Chrome if Edge is not preferred
if %errorlevel% neq 0 (
    start chrome --app="http://localhost:3000" --window-size=1280,800
)

exit
