@echo off
echo.
echo ========================================================
echo .env dosyasi GitHub takip listesinden temizleniyor...
echo ========================================================
echo.

git rm -r --cached .env
git add .gitignore
git commit -m "chore: Guvenlik acigini onlemek icin .env dosyasi git'ten kaldirildi"
git push origin main
echo.

echo ========================================================
echo TEMIZLIK TAMAMLANDI! Artik sifreleriniz asla GitHub'a gitmeyecek.
echo ========================================================
pause
