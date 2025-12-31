@echo off
REM Project Management Server Startup Script
REM This script starts the server with Google Sheets auto-sync enabled

echo ========================================
echo Project Management Server
echo ========================================
echo.
echo Configuration:
echo - Sheet ID: 1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY
echo - Project GID: 1287888772
echo - CR GID: 355802550
echo - Auto-sync: Every 5 minutes
echo.
echo Access URLs:
echo - Local:   http://localhost:3000
echo - Network: http://172.30.18.102:3000
echo.
echo Share the Network URL with your team!
echo ========================================
echo.

set SHEET_ID=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY
set GID=1287888772
set CR_GID=355802550

node backend/server.js

