'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import styles from './Footer.module.css';

export function Footer() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const handleAnchorNav = (e: React.MouseEvent, targetId: string, view?: 'map' | 'table') => {
    if (view) {
      useAppStore.getState().setActiveView(view);
    }
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      const el = document.getElementById(targetId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', view ? `/?view=${view}#${targetId}` : `/#${targetId}`);
      }
    }
  };

  const handleDirectNav = (e: React.MouseEvent, targetUrl: string) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    router.push(targetUrl);
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Üst Kısım: 4 Sütunlu Koyu Tema Grid */}
        <div className={styles.topRow}>
          {/* Sütun 1: Marka & Künye */}
          <div className={styles.brandCol}>
            <div className={styles.logoWrap}>
              <div className={styles.logoIcon} style={{ background: 'transparent' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="28" height="28">
                  <defs>
                    <linearGradient id="footerLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4ea3ed" />
                      <stop offset="100%" stopColor="#1e73be" />
                    </linearGradient>
                  </defs>
                  <rect width="512" height="512" rx="128" fill="url(#footerLogoBg)" />
                  <circle cx="256" cy="256" r="170" fill="none" stroke="#93c5fd" strokeWidth="14" strokeOpacity="0.35" strokeDasharray="24 16" />
                  <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" strokeWidth="16" strokeOpacity="0.75" />
                  <circle cx="256" cy="256" r="70" fill="none" stroke="#bfdbfe" strokeWidth="12" strokeOpacity="0.9" />
                  <line x1="256" y1="96" x2="256" y2="160" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
                  <line x1="256" y1="352" x2="256" y2="416" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
                  <line x1="96" y1="256" x2="160" y2="256" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
                  <line x1="352" y1="256" x2="416" y2="256" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.8" />
                  <circle cx="256" cy="256" r="32" fill="#ffffff" />
                  <circle cx="256" cy="256" r="14" fill="#1e73be" />
                </svg>
              </div>
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
              <li>
                <Link
                  href="/?view=map#harita"
                  onClick={(e) => handleAnchorNav(e, 'harita', 'map')}
                >
                  Harita Görünümü
                </Link>
              </li>
              <li>
                <Link
                  href="/?view=table#harita"
                  onClick={(e) => handleAnchorNav(e, 'harita', 'table')}
                >
                  Tablo Görünümü
                </Link>
              </li>
              <li><Link href="/my-issues" onClick={(e) => handleDirectNav(e, '/my-issues')}>Bildirimlerim</Link></li>
              <li><Link href="/register" onClick={(e) => handleDirectNav(e, '/register')}>Kayıt Ol</Link></li>
              <li><Link href="/login" onClick={(e) => handleDirectNav(e, '/login')}>Giriş Yap</Link></li>
            </ul>
          </div>

          {/* Sütun 3: Kurumsal */}
          <div>
            <h4 className={styles.colHeader}>Kurumsal</h4>
            <ul className={styles.linkList}>
              <li><Link href="/iletisim" onClick={(e) => handleDirectNav(e, '/iletisim')}>İletişim</Link></li>
              <li>
                <Link
                  href="/#nasil-calisir"
                  onClick={(e) => handleAnchorNav(e, 'nasil-calisir')}
                >
                  Yardım
                </Link>
              </li>
              <li><Link href="/iletisim" onClick={(e) => handleDirectNav(e, '/iletisim')}>Basın</Link></li>
              <li>
                <Link
                  href="/#nasil-calisir"
                  onClick={(e) => handleAnchorNav(e, 'nasil-calisir')}
                >
                  Nasıl Çalışır?
                </Link>
              </li>
            </ul>
          </div>

          {/* Sütun 4: Yasal & Mevzuat */}
          <div>
            <h4 className={styles.colHeader}>Yasal & Mevzuat</h4>
            <ul className={styles.linkList}>
              <li><Link href="/kvkk" onClick={(e) => handleDirectNav(e, '/kvkk')}>KVKK Aydınlatma Metni</Link></li>
              <li><Link href="/gizlilik" onClick={(e) => handleDirectNav(e, '/gizlilik')}>Gizlilik Politikası</Link></li>
              <li><Link href="/kullanim-kosullari" onClick={(e) => handleDirectNav(e, '/kullanim-kosullari')}>Kullanım Koşulları</Link></li>
              <li><Link href="/cerez-politikasi" onClick={(e) => handleDirectNav(e, '/cerez-politikasi')}>Çerez Politikası</Link></li>
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
        </div>
      </div>
    </footer>
  );
}
