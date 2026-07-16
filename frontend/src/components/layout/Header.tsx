'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import {
  IconMapPin, IconMap, IconTable, IconPlus,
  IconLogin, IconUserPlus, IconUser, IconFileText, IconBell, IconLogOut,
  IconClock, IconSearch, IconCheckCircle, IconAlertCircle
} from '@/components/ui/Icon';
import styles from './Header.module.css';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, activeView, setActiveView, setReportModalOpen } =
    useAppStore();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "İhbarınız incelemeye alındı",
      description: "Dikmen Caddesi Su Patlağı ihbarınız yetkililer tarafından inceleniyor.",
      time: "5 dk önce",
      type: "review",
      unread: true
    },
    {
      id: 2,
      title: "Yeni durum güncellemesi",
      description: "Turan Güneş Bulvarı Çukur ihbarınız açık durumunda bekliyor.",
      time: "1 saat önce",
      type: "update",
      unread: true
    },
    {
      id: 3,
      title: "İhbarınız çözüldü",
      description: "Park aydınlatma ihbarınız çözüldü olarak işaretlendi.",
      time: "Dün",
      type: "resolved",
      unread: false
    }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="34" height="34" style={{ filter: 'drop-shadow(0 2px 5px rgba(37,99,235,0.35))' }}>
            <defs>
              <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4ea3ed" />
                <stop offset="100%" stopColor="#1e73be" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="128" fill="url(#logoBgGrad)" />
            <circle cx="256" cy="256" r="170" fill="none" stroke="#93c5fd" strokeWidth="14" strokeOpacity="0.35" strokeDasharray="24 16" />
            <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" strokeWidth="16" strokeOpacity="0.75" />
            <circle cx="256" cy="256" r="70" fill="none" stroke="#bfdbfe" strokeWidth="12" strokeOpacity="0.9" />
            <line x1="256" y1="96" x2="256" y2="160" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
            <line x1="256" y1="352" x2="256" y2="416" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
            <line x1="96" y1="256" x2="160" y2="256" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
            <line x1="352" y1="256" x2="416" y2="256" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
            <circle cx="256" cy="256" r="32" fill="#ffffff" />
            <circle cx="256" cy="256" r="14" fill="#1e73be" />
          </svg>
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoName}>Türkiye Sorun Bildirim Haritası</span>
        </div>
      </Link>

      {/* View Toggle */}
      <div className={styles.viewToggle}>
        <button
          id="view-map"
          className={`${styles.viewBtn} ${activeView === 'map' ? styles.viewBtnActive : ''}`}
          onClick={() => {
            setActiveView('map');
            if (pathname !== '/') router.push('/');
          }}
        >
          <IconMap size={15} />
          <span>Harita</span>
        </button>
        <button
          id="view-table"
          className={`${styles.viewBtn} ${activeView === 'table' ? styles.viewBtnActive : ''}`}
          onClick={() => {
            setActiveView('table');
            if (pathname !== '/') router.push('/');
          }}
        >
          <IconTable size={15} />
          <span>Tablo</span>
        </button>
      </div>

      {/* Actions */}
      <div className={styles.actions}>

        {isAuthenticated ? (
          <>
            <button
              id="btn-report-issue"
              className="btn btn-primary"
              onClick={() => setReportModalOpen(true)}
              title="Sorun Bildir"
              aria-label="Sorun Bildir"
            >
              <IconPlus size={14} />
              <span>Sorun Bildir</span>
            </button>

            {/* Notification Bell */}
            <div className={styles.notificationWrapper} ref={notificationRef}>
              <button 
                className={styles.notificationBtn}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                aria-label="Bildirimler"
              >
                <IconBell size={18} />
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>{unreadCount}</span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className={styles.notificationPanel}>
                  <div className={styles.notificationHeader}>
                    <div>
                      <h4>Bildirimler</h4>
                      <p>İhbarlarınızla ilgili son güncellemeler</p>
                    </div>
                    <button className={styles.markReadBtn} onClick={markAllAsRead}>
                      Tümünü okundu yap
                    </button>
                  </div>

                  <div className={styles.notificationList}>
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className={`${styles.notificationItem} ${notif.unread ? styles.notificationUnread : ''}`}>
                          <div className={styles.notificationIconWrap} data-type={notif.type}>
                            {notif.type === 'review' && <IconSearch size={16} />}
                            {notif.type === 'resolved' && <IconCheckCircle size={16} />}
                            {notif.type === 'update' && <IconBell size={16} />}
                            {notif.type === 'alert' && <IconAlertCircle size={16} />}
                          </div>
                          <div className={styles.notificationContent}>
                            <h5>{notif.title}</h5>
                            <p>{notif.description}</p>
                            <span>{notif.time}</span>
                          </div>
                          {notif.unread && <div className={styles.unreadDot} />}
                        </div>
                      ))
                    ) : (
                      <div className={styles.notificationEmpty}>
                        <IconBell size={24} color="#94a3b8" />
                        <h5>Bildirim yok</h5>
                        <p>İhbarlarınızla ilgili güncellemeler burada görünecek.</p>
                      </div>
                    )}
                  </div>

                  <div className={styles.notificationFooter}>
                    <Link href="/profile?tab=reports" className={styles.viewAllBtn} onClick={() => setIsNotificationsOpen(false)}>
                      Tüm bildirimleri görüntüle
                    </Link>
                  </div>
                </div>
              )}
            </div>

              {(user?.role === 'INSTITUTION_OFFICER' || user?.role === 'SUPER_ADMIN') && (
                <Link href="/portal" className={`btn btn-secondary btn-sm ${styles.portalBtn}`} title="Yönetim Portalı">
                  <span>Yönetim Portalı</span>
                </Link>
              )}

              <div className={styles.userMenuWrapper}>
                <Link href="/profile" className={styles.userMenu} style={{ textDecoration: 'none' }}>
                  <div className={styles.avatar} style={{ overflow: 'hidden', position: 'relative' }}>
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt="Profil fotoğrafı"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                    )}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
                    <span className={styles.userRole}>{getRoleLabel(user?.role)}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)', marginLeft: '2px' }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <div className={styles.userDropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user?.firstName} {user?.lastName}</span>
                    <span className={styles.dropdownRole}>{getRoleLabel(user?.role)}</span>
                  </div>
                  
                  <Link href="/profile?tab=info" className={styles.dropdownItem}>
                    <IconUser size={17} strokeWidth={1.8} />
                    Profil Sayfam
                  </Link>
                  <Link href="/profile?tab=reports" className={styles.dropdownItem}>
                    <IconFileText size={17} strokeWidth={1.8} />
                    İhbarlarım
                  </Link>
                  
                  <div className={styles.dropdownSeparator}></div>
                  
                  <button className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`} onClick={logout}>
                    <IconLogOut size={17} strokeWidth={1.8} />
                    Çıkış Yap
                  </button>
                </div>
              </div>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary" id="btn-login" title="Giriş Yap">
            <IconLogin size={15} />
            Giriş Yap
          </Link>
        )}
      </div>
    </header>
  );
}

function getRoleLabel(role?: string): string {
  const labels: Record<string, string> = {
    CITIZEN: 'Vatandaş',
    INSTITUTION_OFFICER: 'Kurum Yetkilisi',
    SUPER_ADMIN: 'Sistem Yöneticisi',
  };
  return role ? (labels[role] || role) : '';
}
