import { CronJob } from 'cron';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * 30 günden eski okunmuş veya okunmamış bildirimleri otomatik silen job.
 * Her gece 03:00'da çalışır.
 * (SORUN-34: Notification cleanup job)
 */
export const notificationCleanupCron = new CronJob(
  '0 3 * * *',
  async () => {
    logger.info('Notification cleanup job started.');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info('Notification cleanup job completed.', { deletedCount: result.count });
    } catch (error) {
      logger.error('Notification cleanup job failed:', error);
    }
  }
);
