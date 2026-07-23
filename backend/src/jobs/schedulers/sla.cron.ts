import { CronJob } from 'cron';
import { prisma } from '../../config/database';
import { getSocket } from '../../config/socket';
import { notificationQueue } from '../queue';
import { logger } from '../../utils/logger';
import { Prisma } from '@prisma/client';

/**
 * Her saat başı ('0 * * * *') çalışan SLA kontrol Cron Job'ı.
 * 48 saati geçmiş ve henüz çözülmemiş (OPEN, IN_REVIEW) sorunları
 * tespit ederek SLA ihlali olarak işaretler ve bildirim gönderir.
 * N+1 sorgusu içermez: Toplu updateMany, createMany ve BullMQ addBulk kullanır.
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

      logger.warn(`[SlaCheckCron] ${breachedIssues.length} sorunda SLA süresi aşıldı! Toplu işleme geçiliyor...`);

      const issueIds = breachedIssues.map(i => i.id);

      // 1. Toplu (Batch) Güncelleme — Tek Sorgu ile tüm ihlalleri slaBreached = true yap
      await prisma.issue.updateMany({
        where: { id: { in: issueIds } },
        data: { slaBreached: true },
      });

      // 2. İlgili bölgelerdeki kurum yetkililerini ve Süper Adminleri tek seferde (batch) çek
      const cities = [...new Set(breachedIssues.map(i => i.city).filter(Boolean))];
      const districts = [...new Set(breachedIssues.map(i => i.district).filter(Boolean))];

      const officers = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'SUPER_ADMIN' },
            {
              role: 'INSTITUTION_OFFICER',
              city: { in: cities },
              district: { in: districts },
            },
          ],
        },
        select: { id: true, role: true, city: true, district: true, email: true },
      });

      const notificationsData: Prisma.NotificationCreateManyInput[] = [];
      const socketPayloads: { userId: string; notification: any }[] = [];
      const emailJobs: any[] = [];

      // Vatandaş ve yetkili bildirimlerini bellekte toplu olarak hazırla
      const now = new Date();
      for (const issue of breachedIssues) {
        const citizenNotif = {
          userId: issue.reportedById,
          title: 'SLA Süresi Aşıldı',
          message: `"${issue.title}" başlıklı başvurunuzun çözüm süresi 48 saati aşmıştır. Konu aciliyetle üst birimlere aktarılmıştır.`,
          type: 'SLA_WARNING' as const,
          link: `/issues/${issue.id}`,
          isRead: false,
          createdAt: now,
        };
        notificationsData.push(citizenNotif);
        socketPayloads.push({ userId: issue.reportedById, notification: citizenNotif });

        // Bölge yetkilisi veya süper adminleri eşleştir
        const matchedOfficers = officers.filter(o => 
          o.role === 'SUPER_ADMIN' || (o.city === issue.city && o.district === issue.district)
        );

        for (const officer of matchedOfficers) {
          const officerNotif = {
            userId: officer.id,
            title: '[SLA UYARISI] Kritik SLA İhlali',
            message: `"${issue.city}/${issue.district}" bölgesindeki "${issue.title}" başlıklı sorunun 48 saatlik çözüm SLA süresi aşılmıştır.`,
            type: 'SLA_WARNING' as const,
            link: `/issues/${issue.id}`,
            isRead: false,
            createdAt: now,
          };
          notificationsData.push(officerNotif);
          socketPayloads.push({ userId: officer.id, notification: officerNotif });

          if (officer.email) {
            emailJobs.push({
              name: 'send-sla-email',
              data: {
                email: officer.email,
                subject: '[SLA UYARISI] Kritik İhlal Bildirimi - Etiya Project',
                text: officerNotif.message,
                html: `<p><strong>${officerNotif.title}</strong></p><p>${officerNotif.message}</p><p><a href="https://etiya-project.tr${officerNotif.link}">İncelemek için tıklayın</a></p>`,
              },
            });
          }
        }
      }

      // 3. Toplu veritabanı eklemesi (createMany) — Binlerce bildirimi tek sorguda yaz
      if (notificationsData.length > 0) {
        await prisma.notification.createMany({
          data: notificationsData,
          skipDuplicates: true,
        });
      }

      // 4. Socket.io anlık yayınlarını asenkron batch olarak bas
      try {
        const socket = getSocket();
        for (const item of socketPayloads) {
          socket.to(`user:${item.userId}`).emit('notification', item.notification);
        }
      } catch (socketErr) {
        logger.debug('[SlaCheckCron] Socket.io toplu yayın yapılamadı:', socketErr);
      }

      // 5. E-posta bildirimlerini BullMQ kuyruğuna (notificationQueue) toplu ekle (addBulk)
      if (emailJobs.length > 0) {
        try {
          await notificationQueue.addBulk(emailJobs);
          logger.info(`[SlaCheckCron] ${emailJobs.length} SLA e-posta bildirimi BullMQ kuyruğuna eklendi.`);
        } catch (queueErr) {
          logger.error('[SlaCheckCron] BullMQ e-posta kuyruğuna eklenirken hata:', queueErr);
        }
      }

      logger.info(`[SlaCheckCron] ${breachedIssues.length} sorun için N+1 içermeyen toplu SLA ihlal işlemi başarıyla tamamlandı.`);
    } catch (err) {
      logger.error('[SlaCheckCron] Hata:', err);
    }
  },
  null,
  false, // worker.ts içinden start() ile başlatılacak
  'Europe/Istanbul',
);
