'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import styles from '../login/page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAppStore();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
    tcKimlik: '', birthYear: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validations
    if (form.tcKimlik.length !== 11 || !/^\d+$/.test(form.tcKimlik)) {
      setError('T.C. Kimlik No 11 haneli ve sadece rakamlardan oluşmalıdır.');
      setLoading(false);
      return;
    }
    const year = parseInt(form.birthYear, 10);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() - 18) {
      setError('Geçerli bir doğum yılı giriniz (18 yaş ve üzeri).');
      setLoading(false);
      return;
    }
    if (form.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      setLoading(false);
      return;
    }

    try {
      const response: any = await api.post('/auth/register', {
        ...form,
        birthYear: year,
      });
      const { user, accessToken, refreshToken } = response.data;

      setTokens(accessToken, refreshToken);
      setUser(user);

      toast.success('Kayıt başarılı! NVİ doğrulaması tamamlandı. 🎉');
      router.push('/');
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
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
            Birlikte Daha<br />Güçlü Türkiye
          </h2>
          <p className={styles.leftDesc}>
            NVİ kimlik doğrulaması ile güvenli kayıt olun.
            Şehrinizin sorunlarını bildirin, çözüme katkı sağlayın.
          </p>

          <div className={styles.featureList}>
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                text: 'NVİ ile güvenli kimlik doğrulama'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
                text: 'Bulunduğunuz yerden sorun bildirin'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
                text: 'Bildirimlerinizi kolayca takip edin'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                text: 'Toplulukla birlikte çözüm üretin'
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
          <h1 className={styles.formTitle}>Hesap oluştur</h1>
          <p className={styles.formSubtitle}>
            Ücretsiz kayıt olun, Türkiye genelinde sorunları bildirin.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorAlert}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Ad Soyad */}
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-first-name">Ad *</label>
              <input
                id="reg-first-name"
                name="firstName"
                className="input"
                placeholder="Adınız"
                value={form.firstName}
                onChange={handleChange}
                required
                autoComplete="given-name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-last-name">Soyad *</label>
              <input
                id="reg-last-name"
                name="lastName"
                className="input"
                placeholder="Soyadınız"
                value={form.lastName}
                onChange={handleChange}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* TC Kimlik */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-tc">T.C. Kimlik No *</label>
            <div className={styles.inputWrap}>
              <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="reg-tc"
                name="tcKimlik"
                className={`input ${styles.inputWithIcon}`}
                placeholder="11 haneli T.C. Kimlik numaranız"
                value={form.tcKimlik}
                onChange={handleChange}
                maxLength={11}
                pattern="[0-9]{11}"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {/* Doğum Yılı + Email grid */}
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-birth-year">Doğum Yılı *</label>
              <input
                id="reg-birth-year"
                name="birthYear"
                type="number"
                className="input"
                placeholder="Örn: 1990"
                value={form.birthYear}
                onChange={handleChange}
                min={1900}
                max={new Date().getFullYear() - 18}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-email">E-posta *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="input"
                placeholder="ornek@mail.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Şifre */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-password">Şifre *</label>
            <div className={styles.inputWrap}>
              <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`input ${styles.inputWithIcon}`}
                placeholder="En az 8 karakter"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
                autoComplete="new-password"
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

          {/* NVI Notice */}
          <div className={styles.nviNotice}>
            <span className={styles.nviIcon}>🔐</span>
            <span>
              Kimlik bilgileriniz <strong>Nüfus ve Vatandaşlık İşleri (NVİ)</strong> servisi
              üzerinden doğrulanır. T.C. Kimlik numaranız şifrelenerek saklanır.
            </span>
          </div>

          <button
            id="btn-register-submit"
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                NVİ doğrulanıyor...
              </>
            ) : (
              <>
                Kayıt Ol
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>

          <div className={styles.divider}>veya</div>

          <p className={styles.footer}>
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className={styles.link}>Giriş Yapın</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
