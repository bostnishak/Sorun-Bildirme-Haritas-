@echo off
echo.
echo ========================================================
echo CANLI SUNUCU GUNCELLEMESI BASLATILIYOR...
echo ========================================================
echo.

ssh -i "C:\Users\bosta\Downloads\ssh-key-2026-07-22.key" -o StrictHostKeyChecking=no ubuntu@92.5.71.25 "sudo bash -c 'PROJECT_DIR=$(dirname $(find /home/ubuntu -maxdepth 3 -name docker-compose.yml | head -n 1)); echo Proje klasoru bulundu: $PROJECT_DIR; cd $PROJECT_DIR && git pull origin main && docker compose up -d --build backend worker && docker exec etiya-project-redis redis-cli FLUSHALL'"

echo.
echo ========================================================
echo ISLEM TAMAMLANDI! 
echo Redis onbellegi ve hatalar silindi. Lutfen sayfayi yenileyin (F5).
echo ========================================================
pause
