'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import {
  IconMapPin, IconMap, IconTable, IconPlus,
  IconLogin, IconUserPlus, IconUser, IconFileText, IconBell, IconLogOut,
  IconClock, IconSearch, IconCheckCircle, IconAlertCircle
} from '@/components/ui/Icon';
import { NotificationBell } from './NotificationBell';
import styles from './Header.module.css';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, activeView, setActiveView, setReportModalOpen } =
    useAppStore();
  const { unreadCount } = useNotificationStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
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
            <div className={styles.desktopOnly}>
              <button
                id="btn-report-issue"
                className={`btn btn-primary ${styles.reportBtn}`}
                onClick={() => setReportModalOpen(true)}
                title="Sorun Bildir"
                aria-label="Sorun Bildir"
              >
                <IconPlus size={14} />
                <span className={styles.reportBtnText}>Sorun Bildir</span>
              </button>
            </div>

            <NotificationBell />

            <div className={styles.desktopOnly}>
              {(user?.role === 'INSTITUTION_OFFICER' || user?.role === 'SUPER_ADMIN') && (
                <Link href="/portal" className={`btn btn-secondary btn-sm ${styles.portalBtn}`} title="Yönetim Portalı">
                  <span>Yönetim Portalı</span>
                </Link>
              )}
            </div>

            <div className={styles.userMenuWrapper} ref={menuRef}>
              <button 
                className={styles.userMenu} 
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }} 
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
              >
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
                  {/* Mobile Notification Badge */}
                  {unreadCount > 0 && (
                    <div className={`${styles.mobileNotificationBadge} ${styles.mobileOnly}`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
                </div>
                <svg className={styles.headerProfileChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)', marginLeft: '2px' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <div className={`${styles.userDropdown} ${isMobileMenuOpen ? styles.isOpen : ''}`}>
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownName}>{user?.firstName} {user?.lastName}</span>
                </div>
                
                <button 
                  type="button"
                  className={styles.dropdownItem} 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    router.push('/profile?tab=info');
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    router.push('/profile?tab=info');
                  }}
                >
                  <IconUser size={17} strokeWidth={1.8} />
                  Profil Sayfam
                </button>
                
                <button 
                  type="button"
                  className={styles.dropdownItem} 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    router.push('/profile?tab=reports');
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    router.push('/profile?tab=reports');
                  }}
                >
                  <IconFileText size={17} strokeWidth={1.8} />
                  İhbarlarım
                </button>
                
                <button 
                  type="button"
                  className={`${styles.dropdownItem} ${styles.mobileOnly}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    setReportModalOpen(true);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    setReportModalOpen(true);
                  }}
                >
                  <IconPlus size={17} strokeWidth={1.8} />
                  Sorun Bildir
                </button>
                
                <button 
                  type="button"
                  className={`${styles.dropdownItem} ${styles.mobileOnly}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-notifications'));
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-notifications'));
                  }}
                >
                  <IconBell size={17} strokeWidth={1.8} />
                  Bildirimler
                </button>

                <div className={styles.dropdownSeparator}></div>
                
                <button 
                  type="button"
                  className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                >
                  <IconLogOut size={17} strokeWidth={1.8} />
                  Çıkış Yap
                </button>
              </div>
            </div>

            <div className={styles.desktopOnly}>
              <button 
                className={styles.headerLogoutBtn} 
                onClick={logout}
                aria-label="Çıkış Yap"
              >
                <IconLogOut size={18} />
              </button>
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
