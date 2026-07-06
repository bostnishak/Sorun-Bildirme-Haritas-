import { CronJob } from 'cron';
import { prisma } from '../../config/database';
import { reportQueue } from '../queue';
import { logger } from '../../utils/logger';

/**
 * Her sabah 08:00'de (Türkiye saati) çalışan günlük rapor cron'u
 * Aktif tüm kurumlar için BullMQ'ya rapor işi ekler
 */
export const dailyReportCron = new CronJob(
  '0 8 * * *',         // Cron expression: Her gün 08:00
  async () => {
    logger.info('[DailyReportCron] Günlük rapor işleri oluşturuluyor...');

    try {
      const activeInstitutions = await prisma.institution.findMany({
        where: {
          isActive: true,
          emailAddress: { not: undefined },
        },
        select: { id: true, name: true, emailAddress: true },
      });

      logger.info(`[DailyReportCron] ${activeInstitutions.length} kurum için rapor kuyruğa ekleniyor`);

      for (const institution of activeInstitutions) {
        await reportQueue.add(
          'daily-report',
          {
            institutionId: institution.id,
            date: new Date().toISOString(),
          },
          {
            // Kurum başına benzersiz job ID (aynı gün iki kez çalışmayı önler)
            jobId: `daily-report-${institution.id}-${new Date().toDateString()}`,
          },
        );

        logger.debug(`[DailyReportCron] Kuyruğa eklendi: ${institution.name}`);
      }

      logger.info(`[DailyReportCron] ${activeInstitutions.length} rapor iş kuyruğuna eklendi`);
    } catch (err) {
      logger.error('[DailyReportCron] Hata:', err);
    }
  },
  null,           // onComplete callback
  false,          // Başlatma — worker.ts'den start() ile başlatılır
  'Europe/Istanbul', // Türkiye saat dilimi
);
