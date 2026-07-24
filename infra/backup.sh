#!/bin/bash
# (SORUN-40) Etiya Project PostgreSQL Database Backup Script with 30-day retention
# Bu betik cron ile her gece çalıştırılmak üzere tasarlanmıştır.

BACKUP_DIR="/var/backups/etiya_project"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILE_NAME="db_backup_$DATE.sql.gz"
CONTAINER_NAME="etiya-project-db"
DB_USER="postgres"
DB_NAME="etiya_project"

mkdir -p "$BACKUP_DIR"

echo "Yedekleme başlatılıyor: $DATE"

# PostgreSQL yedeğini al ve sıkıştır
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/$FILE_NAME"

if [ $? -eq 0 ]; then
  echo "Yedekleme başarıyla tamamlandı: $BACKUP_DIR/$FILE_NAME"
else
  echo "Yedekleme sırasında hata oluştu!"
  exit 1
fi

# 30 Günden eski yedekleri sil (Retention: 30 days)
echo "Eski yedekler temizleniyor (30 günden eski)..."
find "$BACKUP_DIR" -type f -name "db_backup_*.sql.gz" -mtime +30 -exec rm -f {} \;

echo "Temizlik tamamlandı."
