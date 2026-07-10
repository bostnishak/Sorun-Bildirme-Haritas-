import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { transporter } from '../../config/nodemailer';
import { env } from '../../config/env';

export const notificationWorker = new Worker(
  'notification-queue',
  async (job: Job) => {
    const { email, subject, text, html } = job.data;
    logger.info(`[NotificationWorker] E-posta gönderiliyor: ${email}`);

    try {
      const info = await transporter.sendMail({
        from: `"Etiya Project Bildirim" <${env.SMTP_USER}>`,
        to: email,
        subject,
        text,
        html,
      });
      logger.info(`[NotificationWorker] Başarılı: ${info.messageId}`);
    } catch (error) {
      logger.error(`[NotificationWorker] Hata: ${(error as Error).message}`);
      throw error;
    }
  },
  { connection: redis as any }
);

notificationWorker.on('failed', (job, err) => {
  logger.error(`[NotificationWorker] Job ${job?.id} başarısız: ${err.message}`);
});
