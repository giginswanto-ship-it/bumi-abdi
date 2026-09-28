@echo off
title BUMI ABDI RESTO - APLIKASI KASIR DINAMIS & QR MENU
color 2F
cls
echo ================================================================
echo   RUMAH MAKAN AYAM GORENG KAMPUNG BUMI ABDI
echo   APLIKASI KASIR POS DINAMIS & SISTEM QR SELF-ORDER MEJA
echo   Tagline: Asli. Gurih. Berkah.
echo ================================================================
echo.
echo Sedang mengaktifkan Server Dinamis Real-Time dan Database...
echo.

node server.js
if %errorlevel% neq 0 (
    echo.
    echo Node.js tidak terdeteksi, membuka aplikasi langsung di browser...
    start msedge --app="%~dp0index.html" || start chrome --app="%~dp0index.html" || start index.html
)
pause
