'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import { IconUser, IconFileText, IconShield } from '@/components/ui/Icon';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore(state => state.setUser);
  const setTokens = useAppStore(state => state.setTokens);
  const setPendingCityZoom = useAppStore(state => state.setPendingCityZoom);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response: any = await api.post('/auth/login', form);
      const authPayload = response?.data || response;
      const { user, accessToken, refreshToken } = authPayload || {};

      if (!user || !accessToken) {
        throw new Error('Kullanıcı bilgisi alınamadı.');
      }

      setTokens(accessToken, refreshToken);
      setUser(user);

      toast.success(`Hoş geldiniz, ${user.firstName || user.email || 'Kullanıcı'}!`);
      setPendingCityZoom(true);
      router.push('/');
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Giriş başarısız. E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setForm({ email, password: 'Etiya2026!' });
    setLoading(true);
    setError('');
    try {
      const response: any = await api.post('/auth/login', { email, password: 'Etiya2026!' });
      const authPayload = response?.data || response;
      const { user, accessToken, refreshToken } = authPayload || {};
      if (!user || !accessToken) throw new Error('Kullanıcı bilgisi alınamadı.');
      setTokens(accessToken, refreshToken);
      setUser(user);
      toast.success(`Hoş geldiniz, ${user.firstName || user.email}!`);
      setPendingCityZoom(true);
      router.push('/');
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Demo girişi başarısız. Lütfen bilgileri kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left decorative panel */}
      <div className={styles.leftPanel}>
        <div className={styles.brandLogo}>
          <div className={styles.brandIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <span className={styles.brandName}>Sorun Haritası</span>
            <span className={styles.brandTagline}>Türkiye Bildirim Platformu</span>
          </div>
        </div>

        <div className={styles.leftContent}>
          <h2 className={styles.leftTitle}>
            Şehrimizi Daha<br />İyi Yapalım
          </h2>
          <p className={styles.leftDesc}>
            Altyapı, çevre ve ulaşım sorunlarını kolayca bildirin.
            Yetkililere doğrudan ulaşın, çözüm sürecini takip edin.
          </p>

          <div className={styles.featureList}>
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
                text: 'Anlık harita üzerinde sorun görüntüleme'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>,
                text: 'Sorun durumunu gerçek zamanlı takip edin'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16"/><path d="M2 18h20"/><path d="M12 2v4"/><path d="M4 18v-8h16v8"/><path d="M8 18v-5"/><path d="M12 18v-5"/><path d="M16 18v-5"/><path d="M4 10L12 6l8 4"/></svg>,
                text: 'Yetkili kurumlarla doğrudan iletişim'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
                text: 'Çözüm bildirimleri ve güncellemeler'
              },
            ].map((f, i) => (
              <div key={i} className={styles.featureItem}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.rightPanel}>
        {/* Back button */}
        <Link href="/" className={styles.backBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ana Sayfaya Dön
        </Link>

        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>Tekrar hoş geldiniz</h1>
          <p className={styles.formSubtitle}>
            Hesabınıza giriş yaparak sorun bildirmeye devam edin.
          </p>
        </div>

        {/* Hızlı Demo Giriş - 3 Hesap Türü */}
        <div style={{ margin: '14px 0 20px', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>HIZLI DEMO GİRİŞİ (TEK TIKLA)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('vatandas@etiya.com')}
              disabled={loading}
              style={{
                padding: '10px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconUser size={15} />
                <span>Vatandaş</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.85 }}>Ankara</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('calisan@etiya.com')}
              disabled={loading}
              style={{
                padding: '10px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                border: '1px solid #10b981', background: '#ecfdf5', color: '#047857',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconFileText size={15} />
                <span>Çalışan</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.85 }}>İstanbul</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@etiya.com')}
              disabled={loading}
              style={{
                padding: '10px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                border: '1px solid #8b5cf6', background: '#f5f3ff', color: '#6d28d9',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IconShield size={15} />
                <span>Admin</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.85 }}>İzmir</span>
            </button>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorAlert}>
              <svg className={styles.errorAlertIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="login-email">E-posta adresi</label>
            <div className={styles.inputWrap}>
              <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                id="login-email"
                type="email"
                className={`input ${styles.inputWithIcon}`}
                placeholder="ornek@mail.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <label className={styles.fieldLabel} htmlFor="login-password">Şifre</label>
              <Link
                href="/forgot-password"
                style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}
              >
                Şifremi Unuttum?
              </Link>
            </div>
            <div className={styles.inputWrap}>
              <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`input ${styles.inputWithIcon}`}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                autoComplete="current-password"
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
                  padding: '4px', display: 'flex', alignItems: 'center',
                }}
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.4s linear infinite', display: 'inline-block' }} />
                Giriş yapılıyor...
              </>
            ) : (
              <>
                Giriş Yap
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>

          <div className={styles.divider}>veya</div>

          <p className={styles.footer}>
            Hesabınız yok mu?{' '}
            <Link href="/register" className={styles.link}>Ücretsiz kayıt olun</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
