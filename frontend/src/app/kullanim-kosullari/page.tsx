import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../kvkk/page.module.css';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Türkiye Sorun Bildirim Haritası',
  description: 'Platform kullanım koşulları.',
};

export default function KullanimKosullariPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Ana Sayfa
          </Link>
          <span className={styles.pageTitle}>Kullanım Koşulları</span>
        </div>
        <span className={styles.lastUpdated}>Son Güncelleme: Ocak 2024</span>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <h1 className={styles.heroTitle}>Kullanım Koşulları</h1>
        <p className={styles.heroDesc}>Platformu kullanmadan önce bu koşulları dikkatlice okuyunuz.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></span>
            1. Genel Hükümler
          </h2>
          <p className={styles.text}>Bu koşullar, "Türkiye Sorun Bildirim Haritası" platformunun T.C. İçişleri Bakanlığı tarafından sunulan hizmetlerini düzenlemektedir. Platformu kullanan her kullanıcı bu koşulları kabul etmiş sayılır.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
            2. Kullanıcı Yükümlülükleri
          </h2>
          <ul className={styles.list}>
            <li>Gerçek ve doğru kimlik bilgileri ile kayıt olmak</li>
            <li>Yalnızca gerçek ve mevcut sorunları bildirmek</li>
            <li>Yanıltıcı, asılsız veya kötü niyetli bildirim yapmamak</li>
            <li>Başkalarının kişisel verilerini izinsiz paylaşmamak</li>
            <li>Platformu spam amacıyla kullanmamak</li>
          </ul>
          <div className={styles.highlight}><strong>Önemli:</strong> Asılsız bildirim durumunda hesabınız kapatılabilir ve yasal işlem başlatılabilir.</div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
            3. Sorumluluk Sınırları
          </h2>
          <ul className={styles.list}>
            <li>Platform, bildirimlerin belirli sürede çözüleceğini garanti etmez</li>
            <li>Kullanıcı içeriklerinin doğruluğundan platform sorumlu değildir</li>
            <li>Teknik arızalarda oluşabilecek veri kayıplarında sorumluluk kabul edilmez</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            4. Fikri Mülkiyet
          </h2>
          <p className={styles.text}>Platform üzerindeki tüm yazılım, tasarım ve içerikler T.C. İçişleri Bakanlığı'na aittir. İzinsiz kopyalama veya dağıtım yasaktır.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
            5. İletişim
          </h2>
          <div className={styles.contactBox}>
            <div className={styles.contactRow}>
              <svg className={styles.contactRowIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>hukuk@sorunharitasi.gov.tr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
