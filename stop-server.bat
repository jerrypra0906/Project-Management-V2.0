@echo off
REM Stop Project Management Server

echo Stopping all Node.js processes on port 3000...
echo.

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Killing process ID: %%P
    taskkill /F /PID %%P
)

echo.
echo Server stopped.
pause

