@echo off
echo.
echo ========================================================
echo Yapay Zeka Halusinasyon Hatasi Duzeltiliyor...
echo 1. Kodlar GitHub'a gonderiliyor...
echo ========================================================
echo.

cd /d "c:\Users\bosta\OneDrive\Desktop\Etiya_Project"
git add backend/src/services/aiChatbotAssistant.service.ts
git commit -m "fix(AI): Asistanin kendi mesajindan kategori uretme (halusinasyon) hatasi giderildi"
git push origin main

echo.
echo ========================================================
echo 2. Canli Sunucu (Oracle) Guncelleniyor...
echo Lutfen bitene kadar bekleyin...
echo ========================================================
echo.

ssh -i "C:\Users\bosta\Downloads\ssh-key-2026-07-22.key" -o StrictHostKeyChecking=no ubuntu@92.5.71.25 "sudo bash -c 'cd /var/www/etiya-project && git pull origin main && docker compose up -d --build backend worker'"

echo.
echo ========================================================
echo MUKEMMEL! Yapay Zeka Duzeltmesi Canliya Alindi!
echo Sitenizi yenileyip asistanla tekrar konusabilirsiniz.
echo ========================================================
pause
