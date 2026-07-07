'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatsBar } from '@/components/layout/StatsBar';
import { FilterSidebar } from '@/components/layout/FilterSidebar';
import { TableView } from '@/components/table/TableView';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import { useAppStore } from '@/store/useAppStore';
import {
  IconMapPin, IconBarChart, IconShield, IconUsers, IconZap,
  IconMail, IconPhone, IconBuilding, IconGlobe, IconFileText,
  IconLock, IconAlertCircle, IconCheckCircle, IconClock,
  IconLeaf, IconRoad, IconWater, IconConstruction, IconLight, IconTree,
  IconMessageSquare, IconTarget, IconArrowRight,
} from '@/components/ui/Icon';
import styles from './page.module.css';

const MapView = dynamic(() => import('@/components/map/MapView').then(m => ({ default: m.MapView })), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}><div className={styles.mapSpinner} /></div>,
});

export default function HomePage() {
  const { activeView, isReportModalOpen, setReportModalOpen } = useAppStore();

  return (
    <div className={styles.page}>
      <Header />

      {/* ── HERO: Map + Stats ─────────────────────────────────────────────── */}
      <section className={styles.heroSection}>
        {/* main app content */}
        <div className={styles.appLayout}>
          <FilterSidebar />
          <main className={styles.mapArea}>
            {activeView === 'map' ? <MapView /> : <TableView />}
          </main>
        </div>
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
            <div className={styles.statsShowcaseNumbers}>
              {[
                { value: '12.458', label: 'Toplam Bildirim', Icon: IconMessageSquare, color: '#1d4ed8' },
                { value: '87%', label: 'Çözüm Oranı', Icon: IconCheckCircle, color: '#16a34a' },
                { value: '48 Saat', label: 'Ortalama Yanıt Süresi', Icon: IconClock, color: '#d97706' },
                { value: '81 İl', label: 'Kapsanan Şehir', Icon: IconMapPin, color: '#7c3aed' },
              ].map((s, i) => (
                <div key={i} className={styles.bigStat}>
                  <div className={styles.bigStatIcon} style={{ color: s.color, background: `${s.color}12` }}>
                    <s.Icon size={20} />
                  </div>
                  <span className={styles.bigStatValue} style={{ color: s.color }}>{s.value}</span>
                  <span className={styles.bigStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>
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
          <div className={styles.contactGrid}>
            {/* Basın */}
            <div className={styles.contactBox}>
              <div className={styles.contactBoxHeader}>
                <div className={styles.contactBoxIcon} style={{ color: '#1d4ed8', background: 'rgba(29,78,216,0.1)' }}>
                  <IconBuilding size={20} />
                </div>
                <h3 className={styles.contactBoxTitle}>Basın ve İletişim</h3>
              </div>
              <p className={styles.contactBoxDesc}>
                Basın mensupları ve medya kuruluşları için iletişim bilgileri.
                Görsel ve bilgi talepleriniz için aşağıdaki kanalları kullanabilirsiniz.
              </p>
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <IconMail size={16} />
                  <span>basin@sorunharitasi.gov.tr</span>
                </div>
                <div className={styles.contactItem}>
                  <IconPhone size={16} />
                  <span>+90 (312) 000 00 00</span>
                </div>
                <div className={styles.contactItem}>
                  <IconGlobe size={16} />
                  <span>sorunharitasi.gov.tr/basin</span>
                </div>
              </div>
            </div>

            {/* Kurumsal */}
            <div className={styles.contactBox}>
              <div className={styles.contactBoxHeader}>
                <div className={styles.contactBoxIcon} style={{ color: '#16a34a', background: 'rgba(22,163,74,0.1)' }}>
                  <IconUsers size={20} />
                </div>
                <h3 className={styles.contactBoxTitle}>Kurumsal İşbirliği</h3>
              </div>
              <p className={styles.contactBoxDesc}>
                Belediyeler, kamu kurumları ve STK'lar için entegrasyon ve
                kurumsal üyelik talepleri.
              </p>
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <IconMail size={16} />
                  <span>kurum@sorunharitasi.gov.tr</span>
                </div>
                <div className={styles.contactItem}>
                  <IconPhone size={16} />
                  <span>+90 (312) 000 00 01</span>
                </div>
              </div>
            </div>

            {/* Teknik */}
            <div className={styles.contactBox}>
              <div className={styles.contactBoxHeader}>
                <div className={styles.contactBoxIcon} style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.1)' }}>
                  <IconZap size={20} />
                </div>
                <h3 className={styles.contactBoxTitle}>Teknik Destek</h3>
              </div>
              <p className={styles.contactBoxDesc}>
                Platform kullanımı, teknik sorunlar ve API entegrasyonu
                konularında destek alın.
              </p>
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <IconMail size={16} />
                  <span>destek@sorunharitasi.gov.tr</span>
                </div>
                <div className={styles.contactItem}>
                  <IconPhone size={16} />
                  <span>+90 (312) 000 00 02</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            {/* Brand */}
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <div className={styles.footerLogoIcon}>
                  <IconMapPin size={16} />
                </div>
                <span className={styles.footerLogoText}>Sorun Haritası</span>
              </div>
              <p className={styles.footerBrandDesc}>
                Türkiye genelinde altyapı ve şehir sorunlarının
                vatandaşlar tarafından bildirilebildiği resmi platform.
              </p>
              <p className={styles.footerBrandSub}>
                T.C. İçişleri Bakanlığı bünyesinde hizmet vermektedir.
              </p>
            </div>

            {/* Platform */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Platform</h4>
              <ul className={styles.footerLinks}>
                <li><Link href="/">Harita Görünümü</Link></li>
                <li><Link href="/">Tablo Görünümü</Link></li>
                <li><Link href="/register">Kayıt Ol</Link></li>
                <li><Link href="/login">Giriş Yap</Link></li>
                <li><Link href="/portal">Kurum Portalı</Link></li>
              </ul>
            </div>

            {/* Kurumsal */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Kurumsal</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#platform">Hakkımızda</a></li>
                <li><a href="#iletisim">İletişim</a></li>
                <li><a href="#iletisim">Basın</a></li>
                <li><a href="#nasil-calisir">Nasıl Çalışır?</a></li>
                <li><a href="#">Kariyer</a></li>
              </ul>
            </div>

            {/* Yasal */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Yasal</h4>
              <ul className={styles.footerLinks}>
                <li>
                  <Link href="/kvkk" className={styles.footerLegalLink}>
                    <IconFileText size={13} />
                    KVKK Aydınlatma Metni
                  </Link>
                </li>
                <li>
                  <Link href="/gizlilik" className={styles.footerLegalLink}>
                    <IconLock size={13} />
                    Gizlilik Politikası
                  </Link>
                </li>
                <li>
                  <Link href="/kullanim-kosullari" className={styles.footerLegalLink}>
                    <IconFileText size={13} />
                    Kullanım Koşulları
                  </Link>
                </li>
                <li>
                  <Link href="/cerez-politikasi" className={styles.footerLegalLink}>
                    <IconShield size={13} />
                    Çerez Politikası
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerCopyright}>
              © {new Date().getFullYear()} Türkiye Sorun Bildirim Haritası. Tüm hakları saklıdır.
            </p>
            <div className={styles.footerBottomLinks}>
              <Link href="/kvkk">KVKK</Link>
              <span>·</span>
              <Link href="/gizlilik">Gizlilik</Link>
              <span>·</span>
              <Link href="/kullanim-kosullari">Koşullar</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Report Modal */}
      {isReportModalOpen && (
        <ReportIssueForm onClose={() => setReportModalOpen(false)} />
      )}
    </div>
  );
}
