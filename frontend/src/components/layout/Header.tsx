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
        <div className={styles.logoIconWrap}>
          <IconMapPin size={18} className={styles.logoIconSvg} />
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
