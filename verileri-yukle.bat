@echo off
echo.
echo ========================================================
echo Veritabani Baslangic Verileri (Seed) Oracle'a Yukleniyor...
echo Lutfen bekleyin...
echo ========================================================
echo.

ssh -i "C:\Users\bosta\Downloads\ssh-key-2026-07-22.key" ubuntu@92.5.71.25 "sudo docker exec etiya-project-api npm run db:seed"

echo.
echo ========================================================
echo ISLEM TAMAMLANDI! Admin hesaplari ve harita ihbarlari eklendi.
echo Lutfen sitenizde CIKIS YAPIP tekrar GIRIS yapmayi unutmayin.
echo ========================================================
pause
