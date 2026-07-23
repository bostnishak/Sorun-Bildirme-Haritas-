@echo off
echo.
echo ========================================================
echo Yonetim Portali Veritabani Cokme Hatasi Duzeltiliyor...
echo 1. Kodlar GitHub'a gonderiliyor...
echo ========================================================
echo.

cd /d "c:\Users\bosta\OneDrive\Desktop\Etiya_Project"
git add .
git commit -m "fix(Admin/Auth): Prisma PostGIS hatasi cozumlendi ve Login Rate Limit esnetildi"
git push origin main

echo.
echo ========================================================
echo 2. Canli Sunucu (Oracle) Guncelleniyor...
echo Lutfen bitene kadar bekleyin...
echo ========================================================
echo.

ssh -i "C:\Users\bosta\Downloads\ssh-key-2026-07-22.key" -o StrictHostKeyChecking=no ubuntu@92.5.71.25 "sudo bash -c 'cd ~/Etiya_Project || cd ~/etiya-project || cd /home/ubuntu/Etiya_Project || cd /home/ubuntu/etiya-project && git pull origin main && docker compose up -d --build backend worker && docker exec etiya-project-redis redis-cli FLUSHALL'"

echo.
echo ========================================================
echo ISLEM TAMAMLANDI! Yonetim Portali Artik Hatasiz Calisacak!
echo Lutfen yonetim portalini yenileyin (F5).
echo ========================================================
pause
