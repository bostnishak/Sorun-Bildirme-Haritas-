@echo off
echo.
echo ========================================================
echo 1/2: Son duzeltmeler (TypeScript ve MapView) GitHub'a gonderiliyor...
echo ========================================================
echo.

git add .
git commit -m "fix: MapView uzerindeki son conflict temizlendi ve Backend Puppeteer tip hatalari giderildi"
git push origin main

echo.
echo ========================================================
echo 2/2: Oracle Canli Sunucusuna (Production) Yükleme Baslatiliyor...
echo ========================================================
echo.

powershell.exe -ExecutionPolicy Bypass -File .\canliyi-guncelle.ps1

echo.
echo ========================================================
echo BUTUN ISLEMLER TAMAMLANDI! CANLI SİTENİZ GÜNCELLENDİ!
echo ========================================================
pause
