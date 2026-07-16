'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import layoutStyles from '../kvkk/page.module.css';

export default function CerezPolitikasiPage() {
  const router = useRouter();

  return (
    <div className={layoutStyles.page}>
      <header className={layoutStyles.header}>
        <div className={layoutStyles.headerLeft}>
          <button onClick={() => router.back()} className={layoutStyles.backLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Geri Dön
          </button>
          <span className={layoutStyles.pageTitle}>Çerez Politikası</span>
        </div>
        <span className={layoutStyles.lastUpdated}>Son Güncelleme: 13 Temmuz 2026</span>
      </header>

      <div className={layoutStyles.hero}>
        <div className={layoutStyles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        </div>
        <h1 className={layoutStyles.heroTitle}>Çerez (Cookie) Politikası</h1>
        <p className={layoutStyles.heroDesc}>Türkiye Sorun Bildirim Haritası (Etiya Project) platformunu ziyaretiniz sırasında kullanıcı deneyiminizin iyileştirilmesi, oturumuzun güvenle sürdürülmesi ve anonim site kullanım istatistiklerinin toplanması amacıyla çerezler kullanılmaktadır.</p>
      </div>

      <div className={layoutStyles.content}>
        <div className={layoutStyles.section}>
          <h2 className={layoutStyles.sectionTitle}>
            <span className={layoutStyles.sectionIcon}>1</span>
            Zorunlu (Oturum) Çerezleri
          </h2>
          <p className={layoutStyles.text}>Platform üzerinde güvenli giriş yapabilmeniz (JWT oturum yönetimi) ve siber saldırılara (CSRF/XSS) karşı korunmanız amacıyla kullanılan teknik çerezlerdir. Bu çerezler olmadan sistemin temel işlevleri çalışmaz.</p>
        </div>

        <div className={layoutStyles.section}>
          <h2 className={layoutStyles.sectionTitle}>
            <span className={layoutStyles.sectionIcon}>2</span>
            Performans ve Analitik Çerezleri
          </h2>
          <p className={layoutStyles.text}>Hangi şehirlerden bildirim yapıldığını ve harita performansını ölçmek amacıyla anonimleştirilmiş istatistiki veriler toplanır. Kişisel kimlik bilgileriniz hiçbir reklam veya pazarlama amacıyla üçüncü şahıslarla paylaşılmaz.</p>
        </div>

        <div className={layoutStyles.section}>
          <h2 className={layoutStyles.sectionTitle}>
            <span className={layoutStyles.sectionIcon}>3</span>
            Çerez Yönetimi
          </h2>
          <p className={layoutStyles.text}>Tarayıcınızın ayarlarından dilediğiniz zaman çerez tercihlerinizi değiştirebilir veya mevcut çerezleri silebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
