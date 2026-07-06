'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import toast from 'react-hot-toast';
import styles from '../login/page.module.css';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

/**
 * Hem mouse hem de dokunmatik ile akıcı kaydırılabilen özel estetik seçim bileşeni
 */
function ScrollSelect({ value, onChange, options, name }: {
  value: string | number;
  onChange: (name: string, value: string) => void;
  options: { value: string | number; label: string }[];
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedObj = options.find(o => String(o.value) === String(value));

  // Mouse wheel ile doğrudan buton üzerinde kaydırma desteği
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const idx = options.findIndex(o => String(o.value) === String(value));
    if (idx === -1) return;
    if (e.deltaY > 0 && idx < options.length - 1) {
      onChange(name, String(options[idx + 1].value));
    } else if (e.deltaY < 0 && idx > 0) {
      onChange(name, String(options[idx - 1].value));
    }
  };

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <div
        onClick={() => setOpen(!open)}
        onWheel={handleWheel}
        style={{
          padding: '10px 12px',
          background: 'var(--color-surface)',
          border: open ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          transition: 'all 0.2s ease',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
        }}
      >
        <span>{selectedObj ? selectedObj.label : value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'var(--color-text-muted)'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '180px',
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
              padding: '4px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {options.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={i}
                  ref={(el) => {
                    if (el && isSelected) {
                      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                  }}
                  onClick={() => {
                    onChange(name, String(opt.value));
                    setOpen(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? 'white' : 'var(--color-text-primary)',
                    background: isSelected ? 'var(--color-primary)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <span>✓</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAppStore();

  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
    tcKimlik: '', phone: '', birthDay: '1', birthMonth: '1', birthYear: '1995',
  });
  const [verifyCodes, setVerifyCodes] = useState({ emailCode: '', smsCode: '' });
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'sms'>('email');

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Şifre kuralları canlı kontrol
  const rules = {
    length: form.password.length >= 8 && form.password.length <= 12,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };
  const isPasswordValid = rules.length && rules.upper && rules.lower && rules.special;

  // Yıllar (en az 18 yaş)
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const years = Array.from({ length: maxYear - 1940 + 1 }, (_, i) => maxYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleCustomChange = (name: string, value: string) => {
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleVerifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerifyCodes(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  // Client-side T.C. Kimlik Algoritma Kontrolü (7 ve 10 Modülo Kuralı)
  const validateTCAlgorithmic = (tc: string): boolean => {
    if (!/^\d{11}$/.test(tc)) return false;
    if (tc[0] === '0') return false;
    const d = tc.split('').map(Number);
    const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
    const evenSum = d[1] + d[3] + d[5] + d[7];
    const d10 = ((oddSum * 7) - evenSum) % 10;
    if (d10 !== d[9]) return false;
    const total = d.slice(0, 10).reduce((a, b) => a + b, 0);
    return (total % 10) === d[10];
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateTCAlgorithmic(form.tcKimlik)) {
      setError('Geçersiz T.C. Kimlik Numarası! 7 ve 10 modülo algoritması kuralına uymuyor.');
      setLoading(false);
      return;
    }

    if (form.phone && !/^5\d{9}$/.test(form.phone)) {
      setError('Telefon numarası 5 ile başlayan 10 haneli olmalıdır (Örn: 5321234567).');
      setLoading(false);
      return;
    }

    if (!isPasswordValid) {
      setError('Lütfen şifre kurallarının tamamını karşılayan bir şifre belirleyin.');
      setLoading(false);
      return;
    }

    try {
      const response: any = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        tcKimlik: form.tcKimlik,
        phone: form.phone || undefined,
        birthYear: parseInt(form.birthYear, 10),
        birthMonth: parseInt(form.birthMonth, 10),
        birthDay: parseInt(form.birthDay, 10),
      });

      toast.success(response?.message || 'Kayıt başarılı! Lütfen doğrulama kodunu girin. 🎉');
      setStep('verify');
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const activeCode = verifyMethod === 'email' ? verifyCodes.emailCode : verifyCodes.smsCode;
    if (activeCode.length !== 6) {
      setError('Doğrulama kodu 6 haneli olmalıdır.');
      setLoading(false);
      return;
    }

    try {
      const response: any = await api.post('/auth/verify-account', {
        email: form.email,
        emailCode: verifyMethod === 'email' ? verifyCodes.emailCode : undefined,
        smsCode: verifyMethod === 'sms' ? verifyCodes.smsCode : undefined,
      });

      const { user, accessToken, refreshToken } = response.data || response;
      setTokens(accessToken, refreshToken);
      setUser(user);

      toast.success('Hesabınız doğrulandı ve giriş yapıldı! Hoş geldiniz. 🎉');
      router.push('/');
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Doğrulama başarısız. Lütfen girdiğiniz kodu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-codes', { email: form.email });
      toast.success('Yeni doğrulama kodları gönderildi!');
    } catch (err: any) {
      toast.error(err?.error?.message || err?.message || 'Kod gönderilemedi.');
    } finally {
      setResendLoading(false);
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
            Güvenli kimlik doğrulaması ve çift aşamalı onay sistemi.
            Şehrinizin sorunlarını bildirin, çözüme katkı sağlayın.
          </p>

          <div className={styles.featureList}>
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                text: 'Akıcı kaydırmalı seçim ve modern arayüz'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                text: 'E-posta veya SMS ile kolay hesap onayı'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
                text: 'Tüm Türkiye genelinde anlık sorun takibi'
              },
            ].map((f, i) => (
              <div key={i} className={styles.featureItem}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <span className={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.rightPanel}>
        {step === 'register' ? (
          <form className={styles.formWrap} onSubmit={handleRegisterSubmit}>
            <Link href="/" className={styles.backBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Ana Sayfaya Dön
            </Link>

            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Hesap Oluştur</h1>
              <p className={styles.formSubtitle}>
                Ücretsiz kayıt olun, Türkiye genelinde sorunları güvenle bildirin.
              </p>
            </div>

            {error && (
              <div className={styles.errorAlert}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
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

            {/* Doğum Tarihi (Gün, Ay, Yıl Özel Kaydırmalı Seçim) */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Doğum Tarihi *</label>
              <div className={styles.grid3}>
                <ScrollSelect
                  name="birthDay"
                  value={form.birthDay}
                  onChange={handleCustomChange}
                  options={days.map(d => ({ value: d, label: d < 10 ? `0${d}` : `${d}` }))}
                />
                <ScrollSelect
                  name="birthMonth"
                  value={form.birthMonth}
                  onChange={handleCustomChange}
                  options={MONTH_NAMES.map((m, i) => ({ value: i + 1, label: m }))}
                />
                <ScrollSelect
                  name="birthYear"
                  value={form.birthYear}
                  onChange={handleCustomChange}
                  options={years.map(y => ({ value: y, label: `${y}` }))}
                />
              </div>
            </div>

            {/* E-posta ve Telefon */}
            <div className={styles.grid2}>
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
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="reg-phone">Telefon Numarası *</label>
                <div className={styles.inputWrap}>
                  <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    className={`input ${styles.inputWithIcon}`}
                    placeholder="5xxxxxxxxx (10 hane)"
                    value={form.phone}
                    onChange={handleChange}
                    maxLength={10}
                    required
                  />
                </div>
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
                  placeholder="En az 8 - 12 karakter"
                  value={form.password}
                  onChange={handleChange}
                  maxLength={12}
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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {/* Live Password Rules */}
              <div className={styles.passwordRules}>
                <div className={`${styles.ruleItem} ${rules.length ? styles.ruleItemValid : ''}`}>
                  <span className={`${styles.ruleIcon} ${rules.length ? styles.ruleIconValid : ''}`}>{rules.length ? '✓' : '•'}</span>
                  En az 8, en fazla 12 karakter olmalıdır
                </div>
                <div className={`${styles.ruleItem} ${rules.upper ? styles.ruleItemValid : ''}`}>
                  <span className={`${styles.ruleIcon} ${rules.upper ? styles.ruleIconValid : ''}`}>{rules.upper ? '✓' : '•'}</span>
                  En az 1 büyük harf (A-Z) içermelidir
                </div>
                <div className={`${styles.ruleItem} ${rules.lower ? styles.ruleItemValid : ''}`}>
                  <span className={`${styles.ruleIcon} ${rules.lower ? styles.ruleIconValid : ''}`}>{rules.lower ? '✓' : '•'}</span>
                  En az 1 küçük harf (a-z) içermelidir
                </div>
                <div className={`${styles.ruleItem} ${rules.special ? styles.ruleItemValid : ''}`}>
                  <span className={`${styles.ruleIcon} ${rules.special ? styles.ruleIconValid : ''}`}>{rules.special ? '✓' : '•'}</span>
                  En az 1 özel karakter (!@#$%^&* vb.) içermelidir
                </div>
              </div>
            </div>

            <button
              id="btn-register-submit"
              type="submit"
              className={`btn btn-primary btn-lg ${styles.submitBtn}`}
              disabled={loading || !isPasswordValid}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Kaydediliyor & Doğrulama Kodları Gönderiliyor...
                </>
              ) : (
                <>
                  Kayıt Ol ve Devam Et
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>

            <div className={styles.divider}>veya</div>

            <p className={styles.footer}>
              Zaten hesabınız var mı?{' '}
              <Link href="/login" className={styles.link}>Giriş Yapın</Link>
            </p>
          </form>
        ) : (
          /* VERIFICATION MODAL / SCREEN (SEÇİMLİ: E-POSTA VEYA SMS) */
          <form className={styles.formWrap} onSubmit={handleVerifySubmit}>
            <button type="button" onClick={() => setStep('register')} className={styles.backBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Kayıt Formuna Dön
            </button>

            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Doğrulama Yöntemi Seçin 🛡️</h1>
              <p className={styles.formSubtitle}>
                Hesabınızı aktifleştirmek için e-posta veya SMS doğrulama seçeneklerinden birini tercih edin.
              </p>
            </div>

            {error && (
              <div className={styles.errorAlert}>
                <span>{error}</span>
              </div>
            )}

            {/* SEÇİM TABLARI */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0 16px' }}>
              <button
                type="button"
                onClick={() => { setVerifyMethod('email'); setError(''); }}
                style={{
                  padding: '12px 10px',
                  background: verifyMethod === 'email' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: verifyMethod === 'email' ? 'white' : 'var(--color-text-primary)',
                  border: verifyMethod === 'email' ? 'none' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: verifyMethod === 'email' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                <span>📧</span> E-posta ile Onayla
              </button>
              <button
                type="button"
                onClick={() => { setVerifyMethod('sms'); setError(''); }}
                style={{
                  padding: '12px 10px',
                  background: verifyMethod === 'sms' ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: verifyMethod === 'sms' ? 'white' : 'var(--color-text-primary)',
                  border: verifyMethod === 'sms' ? 'none' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: verifyMethod === 'sms' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                <span>💬</span> SMS ile Onayla
              </button>
            </div>

            <div className={styles.verifyBox}>
              {verifyMethod === 'email' ? (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>E-posta Doğrulama Kodu *</label>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    <strong>{form.email}</strong> adresine gönderilen 6 haneli kodu girin.
                  </p>
                  <input
                    name="emailCode"
                    className="input"
                    placeholder="6 Haneli E-posta Kodu"
                    value={verifyCodes.emailCode}
                    onChange={handleVerifyChange}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 'bold' }}
                    required
                  />
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>SMS Doğrulama Kodu *</label>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    <strong>+90 {form.phone}</strong> telefon numarasına gönderilen 6 haneli SMS kodunu girin.
                  </p>
                  <input
                    name="smsCode"
                    className="input"
                    placeholder="6 Haneli SMS Kodu"
                    value={verifyCodes.smsCode}
                    onChange={handleVerifyChange}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 'bold' }}
                    required
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-lg ${styles.submitBtn}`}
              disabled={loading || (verifyMethod === 'email' ? verifyCodes.emailCode.length !== 6 : verifyCodes.smsCode.length !== 6)}
            >
              {loading ? 'Doğrulanıyor...' : (verifyMethod === 'email' ? '📧 E-posta Kodunu Doğrula →' : '💬 SMS Kodunu Doğrula →')}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className={styles.link}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                {resendLoading ? 'Gönderiliyor...' : '🔄 Kod ulaşmadı mı? Yeniden Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
