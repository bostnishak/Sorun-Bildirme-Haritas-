'use client';

import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Üst Kısım: Marka ve Açıklama */}
        <div className={styles.topRow}>
          <div className={styles.brandCol}>
            <div className={styles.logoWrap}>
              <span className={styles.logoIcon}>🗺️</span>
              <span className={styles.brandTitle}>Türkiye Sorun Bildirim Haritası</span>
            </div>
            <p className={styles.brandDesc}>
              Vatandaşların kentsel altyapı ve çevre sorunlarını harita üzerinden şeffafça bildirmesi, kurumların ise çözüm süreçlerini etkin takip etmesi için geliştirilmiş açık ve bağımsız platform.
            </p>
          </div>

          {/* Orta Kısım: Hızlı Linkler */}
          <div className={styles.linksCol}>
            <h4 className={styles.colHeader}>Platform</h4>
            <ul className={styles.linkList}>
              <li><Link href="/">Harita Görünümü</Link></li>
              <li><Link href="/">Tablo Görünümü</Link></li>
              <li><Link href="/register">Kayıt Ol</Link></li>
              <li><Link href="/login">Giriş Yap</Link></li>
            </ul>
          </div>

          {/* Sağ Kısım: Yasal ve Mevzuat Linkleri */}
          <div className={styles.linksCol}>
            <h4 className={styles.colHeader}>Yasal & Mevzuat</h4>
            <ul className={styles.linkList}>
              <li><Link href="/kvkk">KVKK Aydınlatma Metni</Link></li>
              <li><Link href="/gizlilik">Gizlilik Politikası</Link></li>
              <li><Link href="/kullanim-kosullari">Kullanım Koşulları</Link></li>
              <li><Link href="/cerez-politikasi">Çerez Politikası</Link></li>
              <li><Link href="/iletisim" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>🚨 İletişim & 5651 Uyar-Kaldır</Link></li>
            </ul>
          </div>
        </div>

        {/* Acil Durum Hatırlatması */}
        <div className={styles.emergencyBox}>
          <span className={styles.emergencyIcon}>⚠️</span>
          <span>
            <strong>Önemli Hatırlatma:</strong> Bu platform acil durum çağrı hattı değildir. Yangın, sağlık, güvenlik ve kurtarma gibi acil müdahale gerektiren durumlarda lütfen derhal <strong>112 Acil Çağrı Merkezi</strong>&apos;ni arayınız.
          </span>
        </div>

        {/* Alt Kısım: Telif ve Bildirim */}
        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            © {currentYear} Türkiye Sorun Bildirim Haritası (Etiya Project). Tüm hakları saklıdır.
          </p>
          <p className={styles.disclaimer}>
            5651 Sayılı Kanun uyarınca yer sağlayıcı olarak hizmet vermektedir.
          </p>
        </div>
      </div>
    </footer>
  );
}
