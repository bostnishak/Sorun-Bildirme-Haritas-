'use client';

import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import {
  IconMapPin, IconMap, IconTable, IconPlus,
  IconLogin, IconUserPlus,
} from '@/components/ui/Icon';
import styles from './Header.module.css';

export function Header() {
  const { user, isAuthenticated, logout, activeView, setActiveView, setReportModalOpen } =
    useAppStore();

  return (
    <header className={styles.header}>
      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="34" height="34" style={{ filter: 'drop-shadow(0 2px 5px rgba(37,99,235,0.35))' }}>
            <defs>
              <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
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
            <circle cx="256" cy="256" r="14" fill="#2563eb" />
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
          onClick={() => setActiveView('map')}
        >
          <IconMap size={15} />
          <span>Harita Görünümü</span>
        </button>
        <button
          id="view-table"
          className={`${styles.viewBtn} ${activeView === 'table' ? styles.viewBtnActive : ''}`}
          onClick={() => setActiveView('table')}
        >
          <IconTable size={15} />
          <span>Tablo Görünümü</span>
        </button>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Link
          href="/pricing"
          className="btn btn-ghost btn-sm"
          style={{ fontWeight: 600, color: '#2563eb' }}
        >
          Kurumsal Paketler
        </Link>

        {isAuthenticated ? (
          <>
            <button
              id="btn-report-issue"
              className="btn btn-primary"
              onClick={() => setReportModalOpen(true)}
            >
              <IconPlus size={14} />
              <span>Sorun Bildir</span>
            </button>

              <Link href="/my-issues" className="btn btn-ghost btn-sm">
                Bildirimlerim
              </Link>

              {(user?.role === 'INSTITUTION_OFFICER' || user?.role === 'SUPER_ADMIN') && (
                <Link href="/portal" className="btn btn-secondary btn-sm">
                  Yönetim Portalı
                </Link>
              )}

              <div className={styles.userMenu}>
                <div className={styles.avatar}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
                  <span className={styles.userRole}>{getRoleLabel(user?.role)}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={logout}>
                  Çıkış
                </button>
              </div>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost" id="btn-login">
              <IconLogin size={15} />
              Giriş Yap
            </Link>
            <Link href="/register" className="btn btn-primary" id="btn-register">
              <IconUserPlus size={15} />
              Kayıt Ol
            </Link>
          </>
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
