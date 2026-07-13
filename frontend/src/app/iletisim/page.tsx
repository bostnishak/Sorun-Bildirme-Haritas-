'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function IletisimPage() {
  const [form, setForm] = useState({
    subjectType: '5651_TAKEDOWN',
    fullName: '',
    email: '',
    tcOrVergiNo: '',
    targetUrl: '',
    description: '',
    declaration: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response: any = await api.post('/legal/contact', {
        subjectType: form.subjectType,
        fullName: form.fullName,
        email: form.email,
        tcOrVergiNo: form.tcOrVergiNo || undefined,
        targetUrl: form.targetUrl || undefined,
        description: form.description,
      });
      const refNo = response?.data?.referenceNo || response?.referenceNo || ('TR-' + Math.floor(100000 + Math.random() * 900000));
      setReferenceNo(refNo);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Başvuru gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Ana Sayfaya Dön
          </Link>
          <h1 className={styles.title}>İletişim & Hukuki Bildirim Merkezi</h1>
          <p className={styles.subtitle}>
            5651 Sayılı Kanun uyarınca içerik kaldırma (Uyar-Kaldır), KVKK Madde 11 talepleri, AI kararlarına itiraz ve genel destek bildirimlerinizi bu form aracılığıyla resmi olarak iletebilirsiniz.
          </p>
        </header>

        <div className={styles.card}>
          {submitted ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.successTitle}>Başvurunuz Resmi Olarak Kayıt Altına Alındı</h2>
              <p className={styles.successDesc}>
                Başvuru Takip / Kayıt Numarası: <strong style={{ color: 'var(--color-primary)' }}>{referenceNo}</strong><br />
                5651 Sayılı Kanun ve KVKK düzenlemeleri gereği talebiniz en geç <strong>24 saat</strong> içinde denetleme birimimiz tarafından incelenerek <strong>{form.email}</strong> adresinize yazılı geri bildirim sağlanacaktır.
              </p>
              <Link
                href="/"
                className={styles.submitBtn}
                style={{ display: 'inline-flex', maxWidth: '240px', margin: '0 auto', textDecoration: 'none' }}
              >
                Haritaya Geri Dön
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>📌 5651 Sayılı Kanun Yer Sağlayıcı Uyarısı</h3>
                <p className={styles.infoBoxDesc}>
                  Platformumuz üzerinde yayınlanan ihbar ve görseller 3. şahıslar tarafından yüklenmektedir. Kişilik haklarınızı veya mahremiyetinizi ihlal ettiğini düşündüğünüz içerikler için bildirimde bulunduğunuzda ihbar geçici olarak gizlenerek hukuki inceleme başlatılır.
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Başvuru / Talep Konusu *</label>
                  <select
                    className={styles.select}
                    value={form.subjectType}
                    onChange={(e) => setForm({ ...form, subjectType: e.target.value })}
                    required
                  >
                    <option value="5651_TAKEDOWN">5651 Sayılı Kanun - İçerik Kaldırma Talebi (Uyar-Kaldır)</option>
                    <option value="KVKK_ERASURE">KVKK Madde 11 - Kişisel Veri Silme & Unutulma Hakkı</option>
                    <option value="AI_OBJECTION">Yapay Zeka (AI) Moderasyon / Maskeleme Kararına İtiraz</option>
                    <option value="GENERAL_SUPPORT">Genel Destek & Öneri Bildirimi</option>
                  </select>
                </div>

                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Ad Soyad / Kurum Adı *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Örn: Ahmet Yılmaz"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>E-posta Adresi *</label>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="resmi_adres@domain.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>T.C. Kimlik / Vergi / Kurum Sicil No (İsteğe Bağlı)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Kimlik doğrulama için"
                      value={form.tcOrVergiNo}
                      onChange={(e) => setForm({ ...form, tcOrVergiNo: e.target.value })}
                    />
                    <span className={styles.hint}>KVKK / 5651 başvurularında yasal taraf tespiti için önerilir.</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>İlgili İçerik / İhbar URL veya ID&apos;si</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Örn: /issues/1111... veya İhbar Başlığı"
                      value={form.targetUrl}
                      onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Talep Detayları ve Gerekçeniz *</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Lütfen kaldırma veya inceleme talep ettiğiniz hususu hukuki gerekçesiyle birlikte detaylı açıklayınız..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer', userSelect: 'none', lineHeight: '1.4' }}>
                  <input
                    type="checkbox"
                    checked={form.declaration}
                    onChange={(e) => setForm({ ...form, declaration: e.target.checked })}
                    required
                    style={{ marginTop: '2px', accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                  />
                  <span>
                    Beyan ettiğim bilgilerin doğru olduğunu, kötü niyetli veya asılsız kaldırma talebi iletmediğimi kabul ve beyan ederim. *
                  </span>
                </label>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: '13.5px', color: '#dc2626' }}>
                    ! {error}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={!form.declaration || loading}>
                  {loading ? (
                    <>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Resmi Talebi Gönder</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
