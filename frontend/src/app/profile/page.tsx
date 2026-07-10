'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { profileApi, issuesApi } from '@/lib/api';
import styles from './Profile.module.css';

type Tab = 'info' | 'password' | 'avatar' | 'notifications';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:      { label: 'Açık',        color: '#2563eb', bg: '#dbeafe' },
  IN_REVIEW: { label: 'İnceleniyor', color: '#d97706', bg: '#fef3c7' },
  RESOLVED:  { label: 'Çözüldü',    color: '#16a34a', bg: '#dcfce7' },
  REJECTED:  { label: 'Reddedildi', color: '#dc2626', bg: '#fee2e2' },
};

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SANITATION: '💧 Su ve Kanalizasyon',
  TRANSPORTATION:   '🚗 Yol / Ulaşım',
  ENVIRONMENT:      '🌿 Çevre ve Temizlik',
  INFRASTRUCTURE:   '🏗️ Altyapı',
  SECURITY:         '🔒 Güvenlik',
  LIGHTING:         '💡 Aydınlatma',
  PARKS:            '🌳 Park ve Yeşil Alan',
};

function getRoleLabel(role?: string) {
  const labels: Record<string, string> = {
    CITIZEN:             'Vatandaş',
    INSTITUTION_OFFICER: 'Kurum Yetkilisi',
    SUPER_ADMIN:         'Sistem Yöneticisi',
  };
  return role ? (labels[role] || role) : '';
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser, logout } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>('info');

  // Profile info form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [infoLoading, setInfoLoading]   = useState(false);
  const [infoSuccess, setInfoSuccess]   = useState('');
  const [infoError, setInfoError]       = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading]   = useState(false);
  const [passSuccess, setPassSuccess]   = useState('');
  const [passError, setPassError]       = useState('');

  // Avatar
  const fileInputRef               = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError]     = useState('');

  // Issues
  const [issues, setIssues]         = useState<any[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Populate form from store
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      if (user.avatarUrl) setPreviewUrl(user.avatarUrl);
    }
  }, [user]);

  // Load issues when tab switches
  const loadIssues = useCallback(async () => {
    setIssuesLoading(true);
    try {
      const res = await profileApi.getMyIssues() as any;
      setIssues(res.data ?? []);
    } catch {
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadIssues();
    }
  }, [activeTab, loadIssues]);

  /* ─── Handlers ─────────────────────────────────────────────────────────── */

  async function handleUpdateInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoLoading(true);
    setInfoSuccess('');
    setInfoError('');
    try {
      const res = await profileApi.updateProfile({ firstName, lastName, phone: phone || null }) as any;
      updateUser({ firstName, lastName, phone: phone || undefined });
      setInfoSuccess('Profil bilgilerin başarıyla güncellendi! ✓');
    } catch (err: any) {
      setInfoError(err?.message || 'Bir hata oluştu. Tekrar dene.');
    } finally {
      setInfoLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassError('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setPassLoading(true);
    setPassSuccess('');
    setPassError('');
    try {
      await profileApi.changePassword({ currentPassword, newPassword });
      setPassSuccess('Şifren başarıyla değiştirildi! Lütfen tekrar giriş yap. ✓');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err?.message || 'Mevcut şifren hatalı olabilir.');
    } finally {
      setPassLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function handleAvatarUpload() {
    if (!selectedFile) return;
    setAvatarLoading(true);
    setAvatarSuccess('');
    setAvatarError('');
    try {
      const fd = new FormData();
      fd.append('avatar', selectedFile);
      const res = await profileApi.uploadAvatar(fd) as any;
      const url = res?.data?.avatarUrl || res?.avatarUrl;
      if (url) {
        updateUser({ avatarUrl: url });
        setPreviewUrl(url);
      }
      setAvatarSuccess('Profil fotoğrafın güncellendi! ✓');
      setSelectedFile(null);
    } catch (err: any) {
      setAvatarError(err?.message || 'Fotoğraf yüklenirken hata oluştu.');
    } finally {
      setAvatarLoading(false);
    }
  }

  if (!isAuthenticated || !user) return null;

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.profilePage}>
      <div className={styles.profileContainer}>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <div className={styles.avatarWrapper} onClick={() => setActiveTab('avatar')}>
              <div className={styles.avatarLarge}>
                {previewUrl && !selectedFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Avatar" className={styles.avatarImg} />
                ) : (
                  <>{user.firstName?.[0]}{user.lastName?.[0]}</>
                )}
              </div>
              <div className={styles.avatarOverlay}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            </div>
            <h2 className={styles.sidebarName}>{user.firstName} {user.lastName}</h2>
            <span className={styles.roleBadge}>{getRoleLabel(user.role)}</span>
          </div>

          <nav className={styles.sidebarNav}>
            {([
              { id: 'info',          icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Hesap Bilgileri' },
              { id: 'password',      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>, label: 'Şifre Değiştir' },
              { id: 'avatar',        icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>, label: 'Profil Fotoğrafı' },
              { id: 'notifications', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>, label: 'Bildirimlerim' },
            ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className={styles.navItem} onClick={() => router.push('/')}>
                <span className={styles.navIcon}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </span>
                Ana Sayfaya Dön
              </button>
              <button className={styles.navItem} style={{ color: '#dc2626' }} onClick={async () => { await logout(); router.push('/login'); }}>
                <span className={styles.navIcon}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </span>
                Çıkış Yap
              </button>
            </div>
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className={styles.mainContent}>

          {/* ── Hesap Bilgileri ── */}
          {activeTab === 'info' && (
            <div className={styles.contentCard}>
              <h2 className={styles.cardTitle}>Hesap Bilgileri</h2>
              <p className={styles.cardSubtitle}>
                Ad, soyad ve telefon numaranı güncelleyebilirsin. E-posta adresi değiştirilemez.
              </p>
              <form onSubmit={handleUpdateInfo}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ad</label>
                    <input
                      id="profile-firstName"
                      className={styles.formInput}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Adın"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Soyad</label>
                    <input
                      id="profile-lastName"
                      className={styles.formInput}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Soyadın"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>E-posta (değiştirilemez)</label>
                    <input
                      className={styles.formInput}
                      value={user.email}
                      disabled
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Telefon Numarası</label>
                    <input
                      id="profile-phone"
                      className={styles.formInput}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 5XX XXX XX XX"
                      type="tel"
                    />
                  </div>
                </div>
                {infoSuccess && <div className={styles.alertSuccess}>✓ {infoSuccess}</div>}
                {infoError   && <div className={styles.alertError}>✗ {infoError}</div>}
                <div className={styles.formActions}>
                  <button type="submit" className={styles.btnPrimary} disabled={infoLoading}>
                    {infoLoading ? 'Kaydediliyor…' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Şifre Değiştir ── */}
          {activeTab === 'password' && (
            <div className={styles.contentCard}>
              <h2 className={styles.cardTitle}>Şifre Değiştir</h2>
              <p className={styles.cardSubtitle}>
                Güvenliğin için şifreni düzenli aralıklarla değiştirmeni öneririz.
                Şifre en az 8 karakter, bir büyük harf ve bir rakam içermelidir.
              </p>
              <form onSubmit={handleChangePassword}>
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.formLabel}>Mevcut Şifre</label>
                    <input
                      id="profile-currentPassword"
                      className={styles.formInput}
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Mevcut şifren"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Yeni Şifre</label>
                    <input
                      id="profile-newPassword"
                      className={styles.formInput}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Yeni şifre"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Yeni Şifre (Tekrar)</label>
                    <input
                      id="profile-confirmPassword"
                      className={styles.formInput}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Yeni şifreyi tekrarla"
                      required
                    />
                  </div>
                </div>
                {passSuccess && <div className={styles.alertSuccess}>{passSuccess}</div>}
                {passError   && <div className={styles.alertError}>✗ {passError}</div>}
                <div className={styles.formActions}>
                  <button type="submit" className={styles.btnPrimary} disabled={passLoading}>
                    {passLoading ? 'Değiştiriliyor…' : 'Şifreyi Değiştir'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Profil Fotoğrafı ── */}
          {activeTab === 'avatar' && (
            <div className={styles.contentCard}>
              <h2 className={styles.cardTitle}>Profil Fotoğrafı</h2>
              <p className={styles.cardSubtitle}>
                Profil fotoğrafı header'da ve bildirimlerde görünür. JPG, PNG veya WebP formatında, en fazla 5 MB.
              </p>

              <div
                className={styles.avatarUploadZone}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Önizleme" className={styles.avatarPreviewLarge} />
                ) : (
                  <div className={styles.avatarInitialsLarge}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                )}
                <p className={styles.uploadHint}>
                  {selectedFile
                    ? <><strong>{selectedFile.name}</strong> seçildi — Kaydet butonuna tıkla</>
                    : <><strong>Tıkla</strong> veya sürükle bırak ile fotoğraf seç</>
                  }
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              {avatarSuccess && <div className={styles.alertSuccess}>{avatarSuccess}</div>}
              {avatarError   && <div className={styles.alertError}>✗ {avatarError}</div>}

              {selectedFile && (
                <div className={styles.formActions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => { setSelectedFile(null); setPreviewUrl(user.avatarUrl || null); }}
                  >
                    İptal
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleAvatarUpload}
                    disabled={avatarLoading}
                  >
                    {avatarLoading ? 'Yükleniyor…' : '📷 Fotoğrafı Kaydet'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Bildirimlerim ── */}
          {activeTab === 'notifications' && (
            <div className={styles.contentCard}>
              <h2 className={styles.cardTitle}>Bildirimlerim</h2>
              <p className={styles.cardSubtitle}>
                Sisteme bildirdiğin tüm sorunları ve güncel durumlarını buradan takip edebilirsin.
              </p>

              {issuesLoading ? (
                <div className={styles.loadingSpinner}>
                  ⏳ Bildirimler yükleniyor…
                </div>
              ) : issues.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📭</div>
                  <p className={styles.emptyStateText}>Henüz bir sorun bildirimi yapmamışsın.</p>
                </div>
              ) : (
                <div className={styles.issuesList}>
                  {issues.map((issue: any) => {
                    const st = STATUS_LABELS[issue.status] ?? { label: issue.status, color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <div key={issue.id} className={styles.issueCard}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.issueTitle}>{issue.title}</div>
                          <div className={styles.issueMeta}>
                            {CATEGORY_LABELS[issue.category] ?? issue.category} &nbsp;·&nbsp;
                            {issue.city} / {issue.district} &nbsp;·&nbsp;
                            {new Date(issue.createdAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <span
                          className={styles.issueStatusBadge}
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
