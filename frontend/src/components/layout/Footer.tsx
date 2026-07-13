'use client';

import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Üst Kısım: 4 Sütunlu Koyu Tema Grid */}
        <div className={styles.topRow}>
          {/* Sütun 1: Marka & Künye */}
          <div className={styles.brandCol}>
            <div className={styles.logoWrap}>
              <div className={styles.logoIcon}>◆</div>
              <span className={styles.brandTitle}>Sorun Haritası</span>
            </div>
            <p className={styles.brandDesc}>
              Türkiye genelinde altyapı ve çevre sorunlarının vatandaşlar tarafından bildirilebildiği, kurumların çözüm süreçlerinin şeffafça takip edildiği açık platform.
            </p>
          </div>

          {/* Sütun 2: Platform */}
          <div>
            <h4 className={styles.colHeader}>Platform</h4>
            <ul className={styles.linkList}>
              <li><Link href="/">Harita Görünümü</Link></li>
              <li><Link href="/my-issues">Bildirimlerim</Link></li>
              <li><Link href="/register">Kayıt Ol</Link></li>
              <li><Link href="/login">Giriş Yap</Link></li>
            </ul>
          </div>

          {/* Sütun 3: Kurumsal */}
          <div>
            <h4 className={styles.colHeader}>Kurumsal</h4>
            <ul className={styles.linkList}>
              <li><Link href="/iletisim">İletişim</Link></li>
              <li><Link href="/iletisim">Basın</Link></li>
              <li><Link href="/">Nasıl Çalışır?</Link></li>
            </ul>
          </div>

          {/* Sütun 4: Yasal & Mevzuat */}
          <div>
            <h4 className={styles.colHeader}>Yasal & Mevzuat</h4>
            <ul className={styles.linkList}>
              <li><Link href="/kvkk">KVKK Aydınlatma Metni</Link></li>
              <li><Link href="/gizlilik">Gizlilik Politikası</Link></li>
              <li><Link href="/kullanim-kosullari">Kullanım Koşulları</Link></li>
              <li><Link href="/cerez-politikasi">Çerez Politikası</Link></li>
              <li><Link href="/iletisim" style={{ color: '#f87171', fontWeight: 600 }}>• İletişim & 5651 Uyar-Kaldır</Link></li>
            </ul>
          </div>
        </div>

        {/* Acil Durum Hatırlatması */}
        <div className={styles.emergencyBox}>
          <span className={styles.emergencyIcon}>!</span>
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
