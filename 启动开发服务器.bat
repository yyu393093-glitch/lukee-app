@echo off
chcp 65001 >nul
set "NODE_EXE=C:\Users\14768\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "VITE_JS=%~dp0node_modules\vite\bin\vite.js"
set "PARSER_JS=%~dp0server\link-parser.mjs"

cd /d "%~dp0"
echo 正在启动路刻 App...
echo 地址：http://127.0.0.1:5173/
if exist "%PARSER_JS%" (
  start "Lukee Link Parser" /min "%NODE_EXE%" "%PARSER_JS%"
)
start "" "http://127.0.0.1:5173/"
"%NODE_EXE%" "%VITE_JS%" --host 127.0.0.1 --port 5173
pause
