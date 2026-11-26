@echo off
setlocal
title StudyBuddy AI
cd /d "%~dp0"

rem Double-click this file to run StudyBuddy.
rem   Start StudyBuddy.bat            -> built UI on http://localhost:8000
rem   Start StudyBuddy.bat -Dev       -> dev server with hot reload
rem   Start StudyBuddy.bat -Port 8080 -> different port

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*

if errorlevel 1 (
    echo.
    echo StudyBuddy stopped with an error. See the message above.
    pause
    exit /b 1
)

endlocal
