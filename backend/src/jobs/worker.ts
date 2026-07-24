/**
 * Worker Entry Point
 * Bu dosya ayrı bir Docker container'da (etiya-project-worker) çalışır.
 * API sunucusundan bağımsız olarak tüm arka plan işlerini yönetir.
 */

import '../config/env'; // Env validasyonu — hata varsa process exit
import '../config/tracing'; // MUST BE THE VERY FIRST IMPORT
import { logger } from '../utils/logger';
import { initSentry } from '../utils/sentry';

// Init Sentry for worker
initSentry(); // Sentry'i argumentsiz çağırıyoruz

// Workers — import edildiğinde otomatik başlar
import { imageProcessorWorker } from './workers/imageProcessor.worker';
import { webhookDispatcherWorker } from './workers/webhookDispatcher.worker';
import { reportGeneratorWorker } from './workers/reportGenerator.worker';
import { notificationWorker } from './workers/notification.worker';

logger.info('[WORKER] Worker servisi başlatıldı (Image, Webhook, Report, Notification).');

// Cron scheduler
import { dailyReportCron } from './schedulers/dailyReport.cron';
import { slaCheckCron } from './schedulers/sla.cron';
import { notificationCleanupCron } from './schedulers/notification.cron';

// MinIO bucket kontrolü
import { ensureBucketExists } from '../services/storage.service';

async function main() {
  logger.info('[WORKER] Etiya Project Worker başlatılıyor...');

  // MinIO bucket hazırlığı
  await ensureBucketExists();

  // Cron job başlat
  dailyReportCron.start();
  slaCheckCron.start();
  notificationCleanupCron.start();
  logger.info('[CRON] Günlük rapor cron\'u, SLA kontrol cron\'u ve Bildirim temizlik cron\'u başlatıldı');

  // Worker sağlık durumları
  logger.info('[WORKER] Image Processing Worker: aktif');
  logger.info('[WORKER] Webhook Dispatcher Worker: aktif');
  logger.info('[WORKER] Report Generator Worker: aktif');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} alındı — worker'lar kapatılıyor...`);

    await Promise.all([
      imageProcessorWorker.close(),
      webhookDispatcherWorker.close(),
      reportGeneratorWorker.close(),
      notificationWorker.close(),
    ]);

    dailyReportCron.stop();
    slaCheckCron.stop();
    notificationCleanupCron.stop();

    // DB bağlantılarını kapat
    const { prisma } = await import('../config/database');
    await prisma.$disconnect();

    logger.info('[OK] Tüm worker\'lar kapatıldı');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Worker başlatma hatası:', err);
  process.exit(1);
});
