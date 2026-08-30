@echo off
title Sowa AI - Windows Desktop Software Builder
cd /d "%~dp0"

echo ===================================================
echo             Building Sowa AI Windows EXE           
echo ===================================================
echo.

echo [1/3] Building frontend client assets...
call npm run build:client
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Bundling backend server...
call npm run build:server
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Packaging Sowa AI Standalone Desktop Application...
call npx @electron/packager . "Sowa AI" --platform=win32 --arch=x64 --out=release --overwrite --asar --ignore="^/node_modules|release|\.git"
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo [SUCCESS] Sowa AI Desktop Executable Created!
echo.
echo Location: release\Sowa AI-win32-x64\Sowa AI.exe
echo ===================================================
echo.

explorer "%~dp0release\Sowa AI-win32-x64"
pause
