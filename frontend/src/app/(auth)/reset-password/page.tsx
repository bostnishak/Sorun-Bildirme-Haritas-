'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from '../login/page.module.css';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get('token') || '' : '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Canlı Şifre Kuralları Kontrolü
  const rules = {
    length: password.length >= 8 && password.length <= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password !== '' && password === confirmPassword,
  };
  const isFormValid = rules.length && rules.upper && rules.lower && rules.special && rules.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Geçersiz şifre sıfırlama bağlantısı (token bulunamadı).');
      return;
    }
    if (!isFormValid) {
      setError('Lütfen şifre kurallarını karşılayan ve eşleşen bir şifre girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res: any = await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success(res?.message || 'Şifreniz başarıyla sıfırlandı!');
      setSuccess(true);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Şifre sıfırlama başarısız. Bağlantı süresi dolmuş olabilir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.rightPanel}>
      <Link href="/login" className={styles.backBtn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Giriş Sayfasına Dön
      </Link>

      {!success ? (
        <>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Yeni Şifre Belirle 🔒</h1>
            <p className={styles.formSubtitle}>
              Hesabınız için güvenlik standartlarına uygun yeni bir şifre oluşturun.
            </p>
          </div>

          {!token && (
            <div className={styles.errorAlert} style={{ marginBottom: 16 }}>
              ⚠️ Uyarı: URL üzerinde geçerli bir sıfırlama tokeni bulunamadı. Lütfen e-postanıza gelen bağlantıya tıkladığınızdan emin olun.
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorAlert}>
                <span>{error}</span>
              </div>
            )}

            {/* Yeni Şifre */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Yeni Şifre *</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input ${styles.inputWithIcon}`}
                  placeholder="En az 8 - 12 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  maxLength={12}
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center'
                  }}
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? '🐵' : '🙈'}
                </button>
              </div>
            </div>

            {/* Şifre Tekrar */}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Yeni Şifre (Tekrar) *</label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input ${styles.inputWithIcon}`}
                  placeholder="Şifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  maxLength={12}
                  required
                />
              </div>
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
              <div className={`${styles.ruleItem} ${rules.match ? styles.ruleItemValid : ''}`}>
                <span className={`${styles.ruleIcon} ${rules.match ? styles.ruleIconValid : ''}`}>{rules.match ? '✓' : '•'}</span>
                Girilen iki şifre birbiriyle eşleşmelidir
              </div>
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-lg ${styles.submitBtn}`}
              disabled={loading || !isFormValid || !token}
            >
              {loading ? 'Şifre Sıfırlanıyor...' : 'Şifremi Sıfırla ve Kaydet →'}
            </button>
          </form>
        </>
      ) : (
        /* SUCCESS SCREEN */
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 64, height: 64, background: '#dcfce7', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>
            🎉
          </div>
          <h2 className={styles.formTitle}>Şifreniz Yenilendi!</h2>
          <p className={styles.formSubtitle} style={{ maxWidth: 400, margin: '10px auto 24px' }}>
            Hesabınızın şifresi başarıyla güncellendi. Artık yeni şifrenizle sisteme güvenle giriş yapabilirsiniz.
          </p>
          <Link href="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-block', width: '100%', textDecoration: 'none', textAlign: 'center', padding: '13px' }}>
            Giriş Yapmaya Devam Et →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.page}>
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
            Yeni ve Güçlü<br />Bir Şifre
          </h2>
          <p className={styles.leftDesc}>
            Hesabınızın güvenliği için güçlü şifre kurallarımızı takip ederek
            yeni şifrenizi belirleyin ve hemen platforma dönün.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className={styles.rightPanel}>Yükleniyor...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
