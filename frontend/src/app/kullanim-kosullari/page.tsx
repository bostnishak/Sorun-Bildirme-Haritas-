'use client';

import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';
import styles from '../kvkk/page.module.css';

// export const metadata: Metadata = {
//   title: 'Kullanım Koşulları | Türkiye Sorun Bildirim Haritası',
//   description: 'Türkiye Sorun Bildirim Haritası (Etiya Project) kullanım koşulları ve yasal uyarılar.',
// };

export default function KullanimKosullariPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.back()} className={styles.backLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Geri Dön
          </button>
          <span className={styles.pageTitle}>Kullanım Koşulları</span>
        </div>
        <span className={styles.lastUpdated}>Son Güncelleme: 13 Temmuz 2026</span>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <h1 className={styles.heroTitle}>Kullanım Koşulları</h1>
        <p className={styles.heroDesc}>Platformu kullanmadan önce hak ve yükümlülüklerinizi düzenleyen bu koşulları dikkatlice okuyunuz.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>1</span>
            Genel Hükümler ve Platform Niteliği
          </h2>
          <p className={styles.text}>
            Bu koşullar, Türkiye Sorun Bildirim Haritası (Etiya Project) platformunun vatandaş ve kurumlara sunduğu dijital etkileşim hizmetlerini düzenlemektedir. Platform <strong>112 vb. acil müdahale hattı değildir</strong>. Platform kamu yararına çalışan sivil/bağımsız bir teknoloji girişimidir.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>2</span>
            Kullanıcı Yükümlülükleri ve İçerik Beyanı
          </h2>
          <ul className={styles.list}>
            <li>Kayıt esnasında verilen ad, soyad ve T.C. Kimlik numarasının doğru ve kişiye ait olması zorunludur.</li>
            <li>Yalnızca kamusal alana ve çevre/altyapıya ait gerçek sorunların bildirilmesi esastır.</li>
            <li>Başkalarının mahremiyetini ihlal eden, kişilik haklarına saldıran veya sahte içerik üretilmesi kesinlikle yasaktır.</li>
            <li>Yüklenen içerikler yapay zeka (LLM ve Vision AI) tarafından otomatik denetlenir. Kural ihlalinde içerikler yayından kaldırılır.</li>
          </ul>
          <div className={styles.highlight}><strong>Önemli:</strong> Asılsız, hakaret içerikli veya kasıtlı yanıltıcı bildirimlerde bulunan hesaplar kapatılır ve 5651 Sayılı Kanun gereğince IP kayıtları yasal makamlarla paylaşılır.</div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>3</span>
            Sorumluluk Reddi ve Sınırları
          </h2>
          <ul className={styles.list}>
            <li>Platform, kullanıcılar tarafından oluşturulan içeriklerin (UGC - User Generated Content) doğruluğu konusunda 5651 Sayılı Kanun uyarınca yer sağlayıcı statüsündedir; içeriklerden doğrudan bildirimi yapan kullanıcı sorumludur.</li>
            <li>Platform, bildirilen sorunların belediyeler veya ilgili kurumlar tarafından çözüleceğini taahhüt etmez.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>4</span>
            Fikri Mülkiyet
          </h2>
          <p className={styles.text}>Platform üzerindeki tüm yazılım mimarisi, logo ve harita arayüz tasarımları Etiya Project ekibine aittir.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>5</span>
            İletişim ve Şikâyet Bildirimi
          </h2>
          <div className={styles.contactBox}>
            <div className={styles.contactRow}>
              <span>📧 destek@sorunharitasi.tr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
