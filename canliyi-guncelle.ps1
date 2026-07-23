# canliyi-guncelle.ps1
# Bu script projedeki degisiklikleri Oracle Cloud sunucuna aktarir ve Docker motorunu gunceller.
Write-Host ">>> Oracle Canli Sunucusu Guncelleniyor (92.5.71.25)..." -ForegroundColor Cyan
tar -czf etiya_update.tar.gz --exclude=node_modules --exclude=.next --exclude=.git --exclude=etiya_update.tar.gz .
scp -i "C:\Users\bosta\Downloads\ssh-key-2026-07-22.key" -o StrictHostKeyChecking=no etiya_update.tar.gz ubuntu@92.5.71.25:~/
ssh -i "C:\Users\bosta\Downloads\ssh-key-2026-07-22.key" -o StrictHostKeyChecking=no ubuntu@92.5.71.25 "tar -xzf etiya_update.tar.gz -C ~/Etiya_Project && rm etiya_update.tar.gz && cd ~/Etiya_Project && docker compose up -d --build"
Remove-Item -ErrorAction SilentlyContinue etiya_update.tar.gz
Write-Host ">>> Guncelleme Basariyla Tamamlandi! Canli Sunucu Yenilendi." -ForegroundColor Green
