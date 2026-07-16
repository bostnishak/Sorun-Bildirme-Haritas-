'use client';

import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';
import styles from '../kvkk/page.module.css';

// export const metadata: Metadata = {
//   title: 'Gizlilik Politikası | Türkiye Sorun Bildirim Haritası',
//   description: 'Verilerinizin nasıl toplandığı, yapay zeka denetimi ve korunduğuna dair gizlilik politikamız.',
// };

export default function GizlilikPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.back()} className={styles.backLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Geri Dön
          </button>
          <span className={styles.pageTitle}>Gizlilik Politikası</span>
        </div>
        <span className={styles.lastUpdated}>Son Güncelleme: 13 Temmuz 2026</span>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
        </div>
        <h1 className={styles.heroTitle}>Gizlilik Politikası</h1>
        <p className={styles.heroDesc}>Verilerinizin nasıl toplandığını, yapay zeka tarafından nasıl denetlendiğini ve korunduğunu açıklayan politikamız.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>1</span>
            Genel Bilgi ve Kapsam
          </h2>
          <p className={styles.text}>Bu politika, Türkiye Sorun Bildirim Haritası (Etiya Project) platformunu kullandığınızda hangi verilerin toplandığını ve işlendiğini açıklar.</p>
          <div className={styles.highlight}>Platformumuzu kullanarak bu Gizlilik Politikası&apos;nı ve KVKK Aydınlatma Metni&apos;ni kabul etmiş sayılırsınız.</div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>2</span>
            Toplanan Veriler
          </h2>
          <ul className={styles.list}>
            <li><strong>Kayıt Verileri:</strong> Ad, soyad, e-posta, cep telefonu, doğum yılı ve T.C. Kimlik Numarası (SHA-256 geri döndürülemez özet olarak saklanır).</li>
            <li><strong>Sorun Bildirimleri:</strong> Başlık, açıklama, fotoğraf, EXIF konum koordinatları ve kategori bilgisi.</li>
            <li><strong>Yapay Zeka ve Görsel Verileri:</strong> Yüklenen fotoğraflar, üçüncü kişi gizliliği için otomatik yüz/plaka bulanıklaştırma işlemine tabi tutulur.</li>
            <li><strong>Teknik Veriler:</strong> 5651 Sayılı Kanun uyarınca IP adresi, tarayıcı türü, zaman damgası ve oturum kayıtları.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>3</span>
            Veri Güvenliği Standartları
          </h2>
          <ul className={styles.list}>
            <li>Tüm veriler <strong>AES-256 şifreleme</strong> ile güvenli veritabanlarında depolanır.</li>
            <li>İnternet trafiği <strong>TLS 1.3</strong> şifreleme protokolüyle korunur.</li>
            <li>T.C. Kimlik numaraları asla açık metin tutulmaz, salted/peppered cryptographic hash ile saklanır.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>4</span>
            Saklama ve İmha Süreleri
          </h2>
          <ul className={styles.list}>
            <li><strong>Hesap verileri:</strong> Hesabınız aktif olduğu sürece saklanır. Hesabınızı sildiğinizde kimlik verileriniz anında silinir veya anonimleştirilir.</li>
            <li><strong>5651 Trafik Logları:</strong> Yasal zorunluluk gereği tam <strong>2 yıl</strong> süreyle saklanır.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>5</span>
            İletişim
          </h2>
          <div className={styles.contactBox}>
            <div className={styles.contactRow}>
              <span>[E-posta] destek@sorunharitasi.tr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
