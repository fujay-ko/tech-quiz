@echo off
chcp 65001 >nul
cd /d %~dp0
echo ==========================================
echo   國中科技練習測驗 - 本地伺服器啟動中
echo   瀏覽器將自動開啟 http://localhost:8000
echo   關閉此視窗即停止伺服器
echo ==========================================
start "" http://localhost:8000
python -m http.server 8000
pause
