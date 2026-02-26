@echo off
REM Home Designer - Windows Installation and Startup Script
REM This script sets up and starts the Home Designer application for Windows users
REM Double-click this file to get started!

setlocal enabledelayedexpansion

REM Set console colors (if supported)
color 0A

echo =========================================
echo   Home Designer - Setup and Start
echo =========================================
echo.

REM ============================================
REM Check Node.js Installation and Version
REM ============================================
echo [1/7] Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please download and install Node.js 20 or later from:
    echo https://nodejs.org/
    echo.
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js %NODE_VERSION% detected

REM Extract major version number (remove 'v' prefix and get first number)
set "VERSION_NUM=%NODE_VERSION:~1%"
for /f "tokens=1 delims=." %%a in ("%VERSION_NUM%") do set MAJOR_VERSION=%%a

if %MAJOR_VERSION% LSS 20 (
    color 0E
    echo.
    echo WARNING: Node.js version %NODE_VERSION% detected.
    echo Node.js 20 or later is recommended for best compatibility.
    echo.
    echo Download the latest version from: https://nodejs.org/
    echo.
    echo Continuing anyway in 5 seconds...
    timeout /t 5 >nul
)

echo OK - Node.js %NODE_VERSION% is ready
echo.

REM ============================================
REM Install Backend Dependencies
REM ============================================
echo [2/7] Installing backend dependencies...
if not exist "backend" (
    color 0C
    echo ERROR: backend directory not found!
    echo Please ensure you're running this script from the home-designer directory.
    pause
    exit /b 1
)

cd backend
call npm install >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Failed to install backend dependencies!
    echo Please check your internet connection and try again.
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK - Backend dependencies installed
echo.

REM ============================================
REM Install Frontend Dependencies
REM ============================================
echo [3/7] Installing frontend dependencies...
if not exist "frontend" (
    color 0C
    echo ERROR: frontend directory not found!
    echo Please ensure you're running this script from the home-designer directory.
    pause
    exit /b 1
)

cd frontend
call npm install >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Failed to install frontend dependencies!
    echo Please check your internet connection and try again.
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK - Frontend dependencies installed
echo.

REM ============================================
REM Initialize Database
REM ============================================
echo [4/7] Initializing database...
if exist "backend\src\db\init.js" (
    node backend\src\db\init.js >nul 2>nul
    if %errorlevel% neq 0 (
        color 0E
        echo WARNING: Database initialization had issues, but continuing...
    ) else (
        echo OK - Database initialized
    )
) else (
    echo NOTE: Database initialization script not found. Skipping...
)
echo.

REM ============================================
REM Kill Any Existing Processes on Ports
REM ============================================
echo [5/7] Clearing ports...
REM Try to kill any processes using ports 5000 and 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
echo OK - Ports cleared
echo.

REM ============================================
REM Start Backend Server
REM ============================================
echo [6/7] Starting backend server...
cd backend
start /B cmd /c "npm run dev > ..\backend-server.log 2>&1"
cd ..
echo OK - Backend server starting on http://localhost:5000
echo.

REM ============================================
REM Start Frontend Server
REM ============================================
echo [7/7] Starting frontend server...
cd frontend
start /B cmd /c "npm run dev > ..\frontend-server.log 2>&1"
cd ..
echo OK - Frontend server starting on http://localhost:5173
echo.

REM ============================================
REM Wait for Servers to Start
REM ============================================
echo Waiting for servers to start...
timeout /t 5 /nobreak >nul
echo.

REM ============================================
REM Open Browser
REM ============================================
echo Opening Home Designer in your browser...
start http://localhost:5173
echo.

REM ============================================
REM Success Message
REM ============================================
color 0A
echo =========================================
echo   Home Designer is Running!
echo =========================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo.
echo   The application should open in your browser.
echo   If it doesn't, manually navigate to:
echo   http://localhost:5173
echo.
echo   Server logs are saved to:
echo   - backend-server.log
echo   - frontend-server.log
echo.
echo =========================================
echo.
echo Press any key to STOP servers and exit...
echo.

REM Wait for user input
pause >nul

REM ============================================
REM Cleanup - Stop Servers
REM ============================================
echo.
echo Stopping servers...

REM Kill processes on ports 5000 and 5173
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo OK - All servers stopped
echo.
echo Thank you for using Home Designer!
echo.
timeout /t 2 >nul

endlocal
exit /b 0
