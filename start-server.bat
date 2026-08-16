@echo off
cd /d "%~dp0"
start /B node _server.js
echo BizShop server running at http://localhost:3000
