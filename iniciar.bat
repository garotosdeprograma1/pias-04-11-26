@echo off
setlocal
chcp 65001 >nul
title DaFix - Iniciar projeto
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 24 LTS em https://nodejs.org e abra este arquivo novamente.
  pause
  exit /b 1
)
node -e "require('./backend/node_modules/sqlite3')" >nul 2>&1
if errorlevel 1 (
  echo Instalando as dependencias do projeto...
  call npm ci --prefix backend
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias. Confira sua conexao e a instalacao do Node.js.
    pause
    exit /b 1
  )
)
node backend/iniciar.js
if errorlevel 1 pause
endlocal
