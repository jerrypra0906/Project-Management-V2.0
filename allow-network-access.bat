@echo off
:: Allow Network Access - Project Management Dashboard
:: This script adds a Windows Firewall rule to allow incoming connections on port 3000

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0allow-network-access.ps1"
) else (
    echo.
    echo ========================================
    echo ADMINISTRATOR PRIVILEGES REQUIRED
    echo ========================================
    echo.
    echo This script needs to run as Administrator to modify firewall settings.
    echo.
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

