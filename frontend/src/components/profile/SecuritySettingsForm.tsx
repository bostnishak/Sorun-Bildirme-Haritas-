'use client';

import React, { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import styles from '@/app/profile/Profile.module.css';

export function SecuritySettingsForm() {
  const { user } = useAppStore();
  const [step, setStep] = useState<'idle' | 'qr' | 'codes'>('idle');
  const [qrData, setQrData] = useState<{ qrCodeUrl: string; secret: string } | null>(null);
  const [token, setToken] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.generate2fa();
      if (res.success || res.qrCodeUrl) {
        setQrData(res.data || res);
        setStep('qr');
      }
    } catch (err: any) {
      setError(err?.message || '2FA kurulumu başlatılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.verify2fa(token);
      if (res.success || res.recoveryCodes) {
        setRecoveryCodes(res.recoveryCodes || res.data?.recoveryCodes || []);
        setStep('codes');
        setSuccessMsg('2FA başarıyla aktifleştirildi!');
      }
    } catch (err: any) {
      setError(err?.message || 'Kod doğrulanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    alert('Kurtarma kodları panoya kopyalandı.');
  };

  const handleDownloadCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([`Etiya Project - İki Adımlı Doğrulama Kurtarma Kodları\n\n${recoveryCodes.join('\n')}\n\nBu kodları güvenli bir yerde saklayınız. Her kod yalnızca bir kez kullanılabilir.`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'etiya-kurtarma-kodlari.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={styles.contentSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Güvenlik & İki Adımlı Doğrulama (2FA)</h3>
        <p className={styles.sectionDescription}>
          Hesabınızı yetkisiz erişimlere karşı korumak için Google Authenticator gibi bir kimlik doğrulama uygulaması ile 2FA aktifleştirebilirsiniz.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', border: '1px solid #bbf7d0' }}>
          {successMsg}
        </div>
      )}

      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1e293b' }}>
              İki Adımlı Doğrulama Durumu
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {user?.isTwoFactorEnabled || step === 'codes' ? (
                <span style={{ color: '#16a34a', fontWeight: 600 }}>● Aktif (Korunuyor)</span>
              ) : (
                <span style={{ color: '#d97706', fontWeight: 600 }}>● Devre Dışı</span>
              )}
            </p>
          </div>

          {step === 'idle' && !user?.isTwoFactorEnabled && (
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              {loading ? 'Başlatılıyor...' : '2FA Aktifleştir'}
            </button>
          )}
        </div>
      </div>

      {step === 'qr' && qrData && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #cbd5e1', maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '16px', color: '#0f172a' }}>1. QR Kodu Tarayın</h4>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Google Authenticator, Microsoft Authenticator veya Authy uygulamasından aşağıdaki QR kodu okutunuz.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrData.qrCodeUrl} alt="2FA QR Code" style={{ width: '200px', height: '200px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }} />
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
            Veya manuel kurulum anahtarı: <strong style={{ color: '#1e293b' }}>{qrData.secret}</strong>
          </p>

          <form onSubmit={handleVerify} style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              2. Uygulamadaki 6 Haneli Kodu Girin
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="Örn: 123456"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', textAlign: 'center', letterSpacing: '4px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || token.length !== 6}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px' }}
              >
                {loading ? 'Doğrulanıyor...' : 'Doğrula & Aktifleştir'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'codes' && recoveryCodes.length > 0 && (
        <div style={{ background: '#fefce8', border: '1px solid #fde047', padding: '24px', borderRadius: '14px', margin: '20px 0' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '16px', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            [UYARI] Yedek / Kurtarma Kodlarınız (Tek Seferlik)
          </h4>
          <p style={{ fontSize: '13px', color: '#a16207', marginBottom: '16px' }}>
            Bu kodları güvenli bir yere kaydediniz. Telefonunuza erişiminizi kaybetmeniz durumunda bu kodlarla hesabınıza giriş yapabilirsiniz. Her kod yalnızca bir kez kullanılabilir.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #eab308', marginBottom: '16px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            {recoveryCodes.map((code, index) => (
              <div key={index} style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                {code}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCopyCodes}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#ffffff' }}
            >
              Kodları Kopyala
            </button>
            <button
              onClick={handleDownloadCodes}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px', fontSize: '13px' }}
            >
              İndir (.txt)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
