import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../kvkk/page.module.css';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Türkiye Sorun Bildirim Haritası',
  description: 'Verilerinizin nasıl toplandığı ve korunduğuna dair gizlilik politikamız.',
};

export default function GizlilikPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Ana Sayfa
          </Link>
          <span className={styles.pageTitle}>Gizlilik Politikası</span>
        </div>
        <span className={styles.lastUpdated}>Son Güncelleme: Ocak 2024</span>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        </div>
        <h1 className={styles.heroTitle}>Gizlilik Politikası</h1>
        <p className={styles.heroDesc}>Verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklayan politikamız.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></span>
            Genel Bilgi
          </h2>
          <p className={styles.text}>Bu politika, platformu kullandığınızda hangi verilerin toplandığını ve nasıl işlendiğini açıklar.</p>
          <div className={styles.highlight}>Platformumuzu kullanarak bu Gizlilik Politikası'nı kabul etmiş sayılırsınız.</div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            Toplanan Veriler
          </h2>
          <ul className={styles.list}>
            <li><strong>Kayıt Verileri:</strong> Ad, soyad, e-posta, T.C. Kimlik No (şifreli), doğum yılı</li>
            <li><strong>Sorun Bildirimleri:</strong> Başlık, açıklama, fotoğraf, konum, kategori</li>
            <li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı türü, ziyaret zamanı</li>
            <li><strong>Çerezler:</strong> Oturum ve tercih çerezleri</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
            Veri Güvenliği
          </h2>
          <ul className={styles.list}>
            <li>Tüm veriler <strong>AES-256 şifreleme</strong> ile depolanır</li>
            <li>Bağlantılar <strong>TLS 1.3</strong> ile şifrelenir</li>
            <li>T.C. Kimlik numaraları <strong>tek yönlü hash</strong> ile saklanır</li>
            <li>Düzenli güvenlik denetimleri yapılır</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg></span>
            Saklama Süreleri
          </h2>
          <ul className={styles.list}>
            <li><strong>Hesap verileri:</strong> Hesap aktif olduğu sürece + 2 yıl</li>
            <li><strong>Sorun bildirimleri:</strong> Çözümlenmesinden itibaren 5 yıl</li>
            <li><strong>Log kayıtları:</strong> 6 ay</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
            İletişim
          </h2>
          <div className={styles.contactBox}>
            <div className={styles.contactRow}>
              <svg className={styles.contactRowIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>gizlilik@sorunharitasi.gov.tr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
