import { create } from 'zustand';
import { notificationApi, NotificationItem } from '@/lib/api';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await notificationApi.list(30, false);
      if (res.success && res.data) {
        set({
          notifications: res.data.notifications || [],
          unreadCount: res.data.unreadCount || 0,
        });
      }
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      const { notifications, unreadCount } = get();
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
      set({
        notifications: updated,
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenemedi:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      const { notifications } = get();
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      set({
        notifications: updated,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Tüm bildirimler okundu olarak işaretlenemedi:', error);
    }
  },

  addNotification: (notification: NotificationItem) => {
    const { notifications, unreadCount } = get();
    // Eğer aynı ID'ye sahip bildirim zaten varsa ekleme
    if (notifications.some((n) => n.id === notification.id)) return;

    set({
      notifications: [notification, ...notifications],
      unreadCount: unreadCount + (notification.isRead ? 0 : 1),
    });
  },
}));
