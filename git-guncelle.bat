@echo off
echo.
echo ========================================================
echo Bekleyen tum degisiklikler temizleniyor ve paketleniyor...
echo ========================================================
echo.

git add .
git commit -m "fix: MapView uzerindeki merge conflict (Ahmet'in kodlariyla) cozuldu ve paketlendi"
git push origin main
echo.

echo ========================================================
echo ISLEM TAMAMLANDI!
echo ========================================================
pause
