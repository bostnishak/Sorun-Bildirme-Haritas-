import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatsBar } from '@/components/layout/StatsBar';
import { MapAreaClient, BigStatsClient, ReportModalClient, ContactSectionClient } from './client-components';
import {
  IconMapPin, IconBarChart, IconShield, IconUsers, IconZap,
  IconMail, IconPhone, IconBuilding, IconGlobe, IconFileText,
  IconLock, IconAlertCircle, IconCheckCircle, IconClock,
  IconLeaf, IconRoad, IconWater, IconConstruction, IconLight, IconTree,
  IconMessageSquare, IconTarget, IconArrowRight,
} from '@/components/ui/Icon';
import styles from './page.module.css'

export default function HomePage() {
  return (
    <div className={styles.page}>
      <Header />

      {/* ── HERO: Map + Stats ─────────────────────────────────────────────── */}
      <section id="harita" className={styles.heroSection}>
        {/* main app content */}
        <MapAreaClient />
        <StatsBar />

        {/* Scroll hint arrow */}
        <a href="#platform" className={styles.scrollHint} aria-label="Aşağı kaydır">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span>Daha Fazla</span>
        </a>
      </section>

      {/* ── PLATFORM HAKKINDA ─────────────────────────────────────────────── */}
      <section id="platform" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <IconMapPin size={14} />
            Platform
          </div>
          <h2 className={styles.sectionTitle}>Türkiye Sorun Bildirim Haritası</h2>
          <p className={styles.sectionDesc}>
            Vatandaşların şehir sorunlarını anlık olarak bildirebildiği, yetkili kurumların
            bu sorunları sistematik şekilde yönettiği ve çözüm sürecinin şeffaf bir şekilde
            takip edilebildiği merkezi dijital platformdur.
          </p>

          <div className={styles.featureGrid}>
            {[
              {
                Icon: IconMapPin,
                color: '#1d4ed8',
                title: 'Anlık Harita',
                desc: 'Tüm Türkiye\'deki sorunları gerçek zamanlı harita üzerinde görüntüleyin.',
              },
              {
                Icon: IconBarChart,
                color: '#16a34a',
                title: 'İstatistiksel Analiz',
                desc: 'Şehir bazında sorun yoğunluğunu ve çözüm oranlarını inceleyin.',
              },
              {
                Icon: IconShield,
                color: '#7c3aed',
                title: 'Güvenli Kimlik Doğrulama',
                desc: 'NVİ entegrasyonu ile sadece gerçek vatandaşlar bildirim yapabilir.',
              },
              {
                Icon: IconZap,
                color: '#ea580c',
                title: 'Hızlı Çözüm Süreci',
                desc: 'Yetkili kurumlar bildirimlere önceliklendirme yaparak hızlıca yanıt verir.',
              },
              {
                Icon: IconUsers,
                color: '#0891b2',
                title: 'Kurumsal Yönetim Portalı',
                desc: 'Belediyeler ve kuruluşlar için özel yönetim paneli ve raporlama araçları.',
              },
              {
                Icon: IconTarget,
                color: '#be185d',
                title: 'Öncelik Yönetimi',
                desc: 'Kritik, yüksek, orta ve düşük öncelik sınıflandırması ile etkin kaynak kullanımı.',
              },
            ].map((f, i) => (
              <div key={i} className={styles.featureCard}>
                <div className={styles.featureIconWrap} style={{ background: `${f.color}12`, color: f.color }}>
                  <f.Icon size={22} />
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── İSTATİSTİKLER ─────────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.statsShowcase}>
            <div className={styles.statsShowcaseText}>
              <div className={styles.sectionBadge}>
                <IconBarChart size={14} />
                İstatistikler
              </div>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: 16 }}>
                Rakamlarla<br />Türkiye Geneli
              </h2>
              <p className={styles.sectionDesc} style={{ textAlign: 'left', maxWidth: 360 }}>
                Platform üzerinden bildirilen sorunların anlık istatistikleri.
                Veriler her 5 dakikada bir güncellenmektedir.
              </p>
              <Link href="#" className={`btn btn-primary ${styles.statsBtn}`}>
                Detaylı Rapor
                <IconArrowRight size={15} />
              </Link>
            </div>
            <BigStatsClient />
          </div>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR ─────────────────────────────────────────────────── */}
      <section id="nasil-calisir" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <IconZap size={14} />
            Süreç
          </div>
          <h2 className={styles.sectionTitle}>Sorun Bildirme Süreci</h2>
          <p className={styles.sectionDesc}>
            3 basit adımda sorunlarınızı yetkili birimlere iletin.
          </p>

          <div className={styles.stepsGrid}>
            {[
              {
                step: '01',
                Icon: IconUsers,
                color: '#1d4ed8',
                title: 'Kayıt & Giriş',
                desc: 'T.C. Kimlik numaranızla NVİ doğrulamasından geçerek güvenli hesap oluşturun.',
              },
              {
                step: '02',
                Icon: IconMapPin,
                color: '#ea580c',
                title: 'Sorunu Bildirin',
                desc: 'Sorunun fotoğrafını çekin, türünü seçin ve konumunuzu belirtin. GPS ile otomatik konum alabilirsiniz.',
              },
              {
                step: '03',
                Icon: IconCheckCircle,
                color: '#16a34a',
                title: 'Takip Edin',
                desc: 'Bildiriminizin durumunu gerçek zamanlı takip edin. Çözüme kavuşunca bildirim alın.',
              },
            ].map((s, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.step}</div>
                <div className={styles.stepIconWrap} style={{ color: s.color, background: `${s.color}12` }}>
                  <s.Icon size={28} />
                </div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BASIN / İLETİŞİM ─────────────────────────────────────────────── */}
      <section id="iletisim" className={styles.section}>
        <div className={styles.container}>
          <ContactSectionClient />
        </div>
      </section>

      {/* Report Modal */}
      <ReportModalClient />
    </div>
  );
}
