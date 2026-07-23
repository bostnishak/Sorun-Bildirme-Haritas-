@echo off
echo.
echo ========================================================
echo Etiya Project - Kod Guncelleme ve Merge Islemi Basliyor...
echo ========================================================
echo.

echo [1/3] Sizin yazdiginiz (benim yaptigim) yeni kodlar kaydediliyor...
git add .
git commit -m "feat: Mobil harita fixleri, 25 maddelik zafiyet duzeltmeleri ve UX optimizasyonlari tamamlandi"
echo.

echo [2/3] Ekip arkadaslarinizin kodlari (remote) aliniyor ve birlestiriliyor...
git pull origin main
echo.

echo [3/3] Birlestirilen kodlar herkesin gormesi icin repoya gonderiliyor...
git push origin main
echo.

echo ========================================================
echo ISLEM TAMAMLANDI! (Eger yukarida kirmizi bir cakisma hatasi yoksa her sey basarili)
echo ========================================================
pause
