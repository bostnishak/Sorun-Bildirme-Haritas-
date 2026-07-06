'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from '../login/page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res: any = await api.post('/auth/forgot-password', { email });
      toast.success(res?.message || 'Şifre sıfırlama bağlantısı gönderildi!');
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Bağlantı gönderilemedi. Lütfen e-posta adresinizi kontrol edin.');
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
            Hesabınız Daima<br />Güvende
          </h2>
          <p className={styles.leftDesc}>
            Şifrenizi unuttuysanız endişelenmeyin. Kayıtlı e-posta adresinizle
            güvenli ve tek kullanımlık bir şifre sıfırlama bağlantısı oluşturabilirsiniz.
          </p>

          <div className={styles.featureList}>
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                text: '256-bit şifrelenmiş benzersiz sıfırlama tokenleri'
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                text: '60 dakika süreyle geçerli güvenli bağlantılar'
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

      {/* Right panel */}
      <div className={styles.rightPanel}>
        <Link href="/login" className={styles.backBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Giriş Sayfasına Dön
        </Link>

        {!submitted ? (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Şifremi Unuttum 🔑</h1>
              <p className={styles.formSubtitle}>
                Kayıt olduğunuz e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {error && (
                <div className={styles.errorAlert}>
                  <span>{error}</span>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="forgot-email">E-posta adresi *</label>
                <div className={styles.inputWrap}>
                  <svg className={styles.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="forgot-email"
                    type="email"
                    className={`input ${styles.inputWithIcon}`}
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                disabled={loading}
              >
                {loading ? 'Bağlantı Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder →'}
              </button>
            </form>
          </>
        ) : (
          /* SUCCESS SCREEN */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, background: '#dcfce7', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>
              ✓
            </div>
            <h2 className={styles.formTitle}>E-posta Gönderildi!</h2>
            <p className={styles.formSubtitle} style={{ maxWidth: 400, margin: '10px auto 24px' }}>
              <strong>{email}</strong> adresine şifre sıfırlama bağlantısını ilettik. Lütfen gelen kutunuzu (ve gerekiyorsa spam klasörünüzü) kontrol edin.
            </p>
            <div className={styles.nviNotice} style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)', textAlign: 'left', marginBottom: 24 }}>
              <span className={styles.nviIcon}>💡</span>
              <span>
                <strong>Geliştirici Notu:</strong> Geliştirme (Test) ortamında çalıştığınız için üretilen şifre sıfırlama linki backend terminal ekrana ve loglara yazılmıştır.
              </span>
            </div>
            <Link href="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-block', width: '100%', textDecoration: 'none', textAlign: 'center', padding: '13px' }}>
              Giriş Ekranına Dön
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
