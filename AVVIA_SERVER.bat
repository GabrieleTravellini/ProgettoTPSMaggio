@echo off
cd /d "%~dp0"
echo Installazione librerie (se necessario) e avvio del Server WebSocket...
cmd /k "npm install ws && node server-ws.js"