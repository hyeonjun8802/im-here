@echo off
cd /d "%~dp0"
call npm install
if errorlevel 1 goto :error
call npm run download:assets
if errorlevel 1 goto :error
call npm run dev
pause
exit /b 0
:error
echo Installation failed. See README.md.
pause
exit /b 1
