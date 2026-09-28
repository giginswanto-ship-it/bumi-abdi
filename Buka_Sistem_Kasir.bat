@echo off
title BUMI ABDI RESTO - SISTEM KASIR & QR MENU
color 2F
cls
echo ========================================================
echo   RUMAH MAKAN AYAM GORENG KAMPUNG BUMI ABDI
echo   SISTEM KASIR POS & QR CODE SELF-ORDER MENU
echo   Tagline: Asli. Gurih. Berkah.
echo ========================================================
echo.
echo Menjalankan sistem kasir...
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    node server.js
) else (
    echo Node.js tidak ditemukan, membuka file index.html langsung di browser...
    start index.html
    pause
)
