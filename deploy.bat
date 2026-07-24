@echo off
echo ===================================================
echo Etiya Project - GitHub'a Yukleme ve Canliya Alma
echo ===================================================
echo.

echo [1/3] Degisiklikler GitHub'a yukleniyor...
git add .
git commit -m "fix: canli sunucu icin nginx ve env ayarlari guncellendi"
git push origin main
echo.

echo [2/3] Eski Docker container'lari durduruluyor...
docker-compose down
echo.

echo [3/3] Yeni ayarlarla Docker container'lari baslatiliyor...
docker-compose up -d --build
echo.

echo Islem tamamlandi!
echo Tarayicinizdan siteye ulasabilirsiniz: http://92.5.71.25:8080
pause
