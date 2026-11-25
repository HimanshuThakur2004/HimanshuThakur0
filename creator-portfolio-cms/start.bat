@echo off
title StoryFrame Portfolio + CMS Server
echo Starting StoryFrame Portfolio ^& CMS Portal on http://localhost:8080 ...
start "" "http://localhost:8080"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Port 8080
pause
