import { prisma } from '../config/database';
import { getSocket } from '../config/socket';
import { logger } from '../utils/logger';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: 'ISSUE_STATUS_CHANGED' | 'SLA_WARNING' | 'GAMIFICATION_BADGE' | 'SYSTEM' | 'UPVOTE';
  link?: string;
}

export const notificationService = {
  /**
   * Bildirim oluşturur (Veritabanına kaydeder ve anlık Socket.io yayını yapar)
   */
  async createNotification(dto: CreateNotificationDto) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          link: dto.link || null,
          isRead: false,
        },
      });

      // Gerçek zamanlı socket bildirimi gönder
      try {
        const socket = getSocket();
        socket.to(`user:${dto.userId}`).emit('notification', notification);
      } catch (err) {
        logger.debug('Socket.io bildirim gönderilemedi (sunucu kapalı olabilir veya istemci bağlı değil):', err);
      }

      return notification;
    } catch (error) {
      logger.error('Bildirim oluşturulurken hata meydana geldi:', error);
      throw error;
    }
  },

  /**
   * Kullanıcının bildirimlerini listeler
   */
  async getUserNotifications(userId: string, limit = 20, unreadOnly = false) {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  },

  /**
   * Bildirimi okundu olarak işaretler
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  },

  /**
   * Kullanıcının tüm bildirimlerini okundu olarak işaretler
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },
};
