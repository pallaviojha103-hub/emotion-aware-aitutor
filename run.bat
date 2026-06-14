@echo off
title ZENITH AI ^| Emotion-Adaptive Learning Ecosystem
color 0B
echo ==========================================================
echo       ZENITH AI - EMOTION-ADAPTIVE LEARNING CORE          
echo ==========================================================
echo.
echo [1/3] Checking workspace folder...
cd /d "%~dp0"

echo [2/3] Checking node dependencies...
if not exist node_modules (
    echo [*] node_modules not found. Installing dependencies...
    call npm install
) else (
    echo [*] Dependencies already verified.
)

echo [3/3] Launching web browser...
start http://localhost:3000/

echo.
echo [*] Starting local development server...
echo.
call npm run dev
pause