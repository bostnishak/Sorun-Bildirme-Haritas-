import { CronJob } from 'cron';
import { prisma } from '../../config/database';
import { notificationService } from '../../services/notification.service';
import { logger } from '../../utils/logger';

/**
 * Her saat başı ('0 * * * *') çalışan SLA kontrol Cron Job'ı.
 * 48 saati geçmiş ve henüz çözülmemiş (OPEN, IN_REVIEW) sorunları
 * tespit ederek SLA ihlali olarak işaretler ve bildirim gönderir.
 */
export const slaCheckCron = new CronJob(
  '0 * * * *', // Her saat başı
  async () => {
    logger.info('[SlaCheckCron] SLA ihlal kontrolleri başlatılıyor...');

    try {
      // 48 saat öncesi
      const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const breachedIssues = await prisma.issue.findMany({
        where: {
          status: { in: ['OPEN', 'IN_REVIEW'] },
          createdAt: { lt: thresholdDate },
          slaBreached: false,
        },
        select: {
          id: true,
          title: true,
          reportedById: true,
          city: true,
          district: true,
        },
      });

      if (breachedIssues.length === 0) {
        logger.info('[SlaCheckCron] Yeni SLA ihlali tespit edilmedi.');
        return;
      }

      logger.warn(`[SlaCheckCron] ${breachedIssues.length} sorunda SLA süresi aşıldı!`);

      for (const issue of breachedIssues) {
        // 1. Veritabanında slaBreached = true yap
        await prisma.issue.update({
          where: { id: issue.id },
          data: { slaBreached: true },
        });

        // 2. Sorunu bildiren vatandaşa SLA gecikme uyarısı / bilgilendirmesi gönder
        await notificationService.createNotification({
          userId: issue.reportedById,
          title: 'SLA Süresi Aşıldı',
          message: `"${issue.title}" başlıklı başvurunuzun çözüm süresi 48 saati aşmıştır. Konu aciliyetle üst birimlere aktarılmıştır.`,
          type: 'SLA_WARNING',
          link: `/issues/${issue.id}`,
        });

        // 3. İlgili bölgedeki kurum yetkililerine ve Süper Adminlere bildirim gönder
        const officers = await prisma.user.findMany({
          where: {
            OR: [
              { role: 'SUPER_ADMIN' },
              {
                role: 'INSTITUTION_OFFICER',
                city: issue.city,
                district: issue.district,
              },
            ],
          },
          select: { id: true },
        });

        for (const officer of officers) {
          await notificationService.createNotification({
            userId: officer.id,
            title: '[SLA UYARISI] Kritik SLA İhlali',
            message: `"${issue.city}/${issue.district}" bölgesindeki "${issue.title}" başlıklı sorunun 48 saatlik çözüm SLA süresi aşılmıştır.`,
            type: 'SLA_WARNING',
            link: `/issues/${issue.id}`,
          });
        }
      }

      logger.info(`[SlaCheckCron] ${breachedIssues.length} sorun SLA ihlali olarak işlendi ve bildirimler gönderildi.`);
    } catch (err) {
      logger.error('[SlaCheckCron] Hata:', err);
    }
  },
  null,
  false, // worker.ts içinden start() ile başlatılacak
  'Europe/Istanbul',
);
