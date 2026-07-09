/**
 * Worker Entry Point
 * Bu dosya ayrı bir Docker container'da (chaosmap-worker) çalışır.
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

logger.info('🚀 Worker servisi başlatıldı (Image, Webhook, Report, Notification).');

// Cron scheduler
import { dailyReportCron } from './schedulers/dailyReport.cron';

// MinIO bucket kontrolü
import { ensureBucketExists } from '../services/storage.service';

async function main() {
  logger.info('🚀 ChaosMind Worker başlatılıyor...');

  // MinIO bucket hazırlığı
  await ensureBucketExists();

  // Cron job başlat
  dailyReportCron.start();
  logger.info('⏰ Günlük rapor cron\'u başlatıldı (Her gün 08:00 Istanbul)');

  // Worker sağlık durumları
  logger.info('⚙️  Image Processing Worker: aktif');
  logger.info('⚙️  Webhook Dispatcher Worker: aktif');
  logger.info('⚙️  Report Generator Worker: aktif');

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

    // DB bağlantılarını kapat
    const { prisma } = await import('../config/database');
    await prisma.$disconnect();

    logger.info('✅ Tüm worker\'lar kapatıldı');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Worker başlatma hatası:', err);
  process.exit(1);
});
