@echo off
cd /d D:\code\claude\signal-lamp
start /B node tcp-bridge.mjs
timeout /t 1 /nobreak >nul
npx electron .