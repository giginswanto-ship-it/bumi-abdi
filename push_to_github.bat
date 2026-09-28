@echo off
title PUSH KE GITHUB - BUMI ABDI RESTO
color 2F
cls
echo ================================================================
echo   PUSH KODE SISTEM KASIR KE GITHUB
echo   Akun / Repo: giginswanto-ship-it
echo ================================================================
echo.

git branch -M main
git add .
git commit -m "feat: Sistem Kasir POS & QR Self-Order Menu Ayam Goreng Kampung BUMI ABDI"

echo.
echo Remote Origin saat ini:
git remote -v
echo.

echo ----------------------------------------------------------------
echo Sedang melakukan Git Push ke origin main...
echo Jika jendela login GitHub muncul, silakan klik 'Sign in with your browser'.
echo ----------------------------------------------------------------
echo.

git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo PERHATIAN:
    echo Jika repository belum dibuat di GitHub, silakan buat repo baru
    echo terlebih dahulu di: https://github.com/new
    echo dengan nama 'bumi-abdi'
    echo.
    echo Atau jika URL repository Anda berbeda, jalankan:
    echo git remote set-url origin https://github.com/USERNAME/REPO_NAME.git
    echo git push -u origin main
    echo ============================================================
) else (
    echo.
    echo [SUKSES] Semua file berhasil di-push ke GitHub!
)

echo.
pause
