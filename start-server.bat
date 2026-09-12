@echo off
title COUNTIFY - Real Computer Vision
echo ========================================================
echo Starting COUNTIFY Local Server...
echo "Solving the world's least important counting problems."
echo ========================================================
echo.
echo Opening browser at http://localhost:8080 ...
start http://localhost:8080
echo.
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Server is already actively running on port 8080!
    echo Main App:                 http://localhost:8080
    echo Standalone Test Bench:    http://localhost:8080/test-camera.html
    echo.
    echo Have fun counting rice, drops, leaves, and beard hairs!
    echo.
    pause
    exit /b 0
)
echo Starting local Python web server on port 8080...
echo (Keep this window open while using Countify)
echo.
echo Main App:              http://localhost:8080
echo Standalone Test Bench: http://localhost:8080/test-camera.html
echo.
python -m http.server 8080
