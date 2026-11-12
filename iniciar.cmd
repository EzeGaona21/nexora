@echo off
chcp 65001 >nul
cd /d "%~dp0"
title NEXORA

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instala la version LTS desde https://nodejs.org y volve a ejecutar este archivo.
  pause
  exit /b 1
)

findstr /r /c:"^SUPABASE_SECRET_KEY=..*" .env.local >nul
if errorlevel 1 (
  echo Falta SUPABASE_SECRET_KEY en .env.local.
  echo Copiala desde supabase.com - proyecto nexora - Project Settings - API keys - Secret key,
  echo pegala despues de SUPABASE_SECRET_KEY= , guarda el archivo y volve a ejecutar.
  notepad .env.local
  exit /b 1
)

if not exist node_modules (
  echo [1/3] Instalando dependencias...
  call npm install
  if errorlevel 1 ( pause & exit /b 1 )
)

echo [2/3] Creando la demo...
call npm run seed:demo
if errorlevel 1 ( pause & exit /b 1 )

echo [3/3] Iniciando NEXORA en http://localhost:3000
start "" http://localhost:3000
call npm run dev
pause
