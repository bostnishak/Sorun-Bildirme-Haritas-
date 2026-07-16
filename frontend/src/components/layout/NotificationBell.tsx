'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAppStore } from '@/store/useAppStore';
import { initSocket } from '@/lib/socket';
import { IconBell, IconCheckCircle, IconAlertCircle, IconSearch } from '@/components/ui/Icon';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAppStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications();

      const socket = initSocket();
      if (socket) {
        socket.emit('join-user', user.id);
        const handleNotification = (notif: any) => {
          addNotification(notif);
        };
        socket.on('notification', handleNotification);

        return () => {
          socket.off('notification', handleNotification);
        };
      }
    }
  }, [isAuthenticated, user?.id, fetchNotifications, addNotification]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Az önce';
      if (diffMins < 60) return `${diffMins} dk önce`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} sa önce`;
      return d.toLocaleDateString('tr-TR');
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Bildirimler"
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <h4>Bildirimler</h4>
              <p>İhbar ve SLA uyarılarınız</p>
            </div>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={() => markAllAsRead()}>
                Tümünü okundu yap
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`${styles.item} ${!notif.isRead ? styles.itemUnread : ''}`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                >
                  <div className={styles.iconWrap} data-type={notif.type}>
                    {notif.type === 'ISSUE_STATUS_CHANGED' && <IconCheckCircle size={18} />}
                    {notif.type === 'SLA_WARNING' && <IconAlertCircle size={18} />}
                    {notif.type !== 'ISSUE_STATUS_CHANGED' && notif.type !== 'SLA_WARNING' && <IconBell size={18} />}
                  </div>
                  <div className={styles.content}>
                    <h5>{notif.title}</h5>
                    <p>{notif.message}</p>
                    <span className={styles.time}>{formatDate(notif.createdAt)}</span>
                  </div>
                  {!notif.isRead && <div className={styles.unreadDot} />}
                </div>
              ))
            ) : (
              <div className={styles.empty}>
                <IconBell size={28} color="#94a3b8" />
                <h5>Bildirim yok</h5>
                <p>Yeni bir gelişme olduğunda burada görüntülenecek.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
