@echo off
REM Project Management App - Firewall Setup
REM This script must be run as Administrator

echo ========================================
echo Project Management App - Firewall Setup
echo ========================================
echo.
echo This script will configure Windows Firewall to allow
echo network access to the application on port 3000.
echo.
echo IMPORTANT: You must run this as Administrator!
echo.
echo Right-click this file and select "Run as administrator"
echo.
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script requires Administrator privileges!
    echo.
    echo Please:
    echo 1. Right-click on this file
    echo 2. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Running with Administrator privileges...
echo.

REM Remove existing rule
echo Removing existing firewall rule if any...
netsh advfirewall firewall delete rule name="Project Management App" >nul 2>&1

REM Add new rule
echo Creating new firewall rule...
netsh advfirewall firewall add rule name="Project Management App" dir=in action=allow protocol=TCP localport=3000 profile=any

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Firewall rule created successfully!
    echo.
    echo Your app is now accessible from other devices:
    echo http://172.30.18.102:3000
    echo.
    echo Verifying firewall rule...
    netsh advfirewall firewall show rule name="Project Management App"
) else (
    echo.
    echo ERROR: Failed to create firewall rule!
    echo.
)

echo.
echo ========================================
pause

