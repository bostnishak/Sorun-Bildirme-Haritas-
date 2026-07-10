import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatsBar } from '@/components/layout/StatsBar';
import { MapAreaClient, BigStatsClient, ReportModalClient } from './client-components';
import {
  IconMapPin, IconBarChart, IconShield, IconUsers, IconZap,
  IconMail, IconPhone, IconBuilding, IconGlobe, IconFileText,
  IconLock, IconAlertCircle, IconCheckCircle, IconClock,
  IconLeaf, IconRoad, IconWater, IconConstruction, IconLight, IconTree,
  IconMessageSquare, IconTarget, IconArrowRight,
} from '@/components/ui/Icon';
import styles from './page.module.css';

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

      {/* ── B2G SAAS ABONELİK VE LİSANSLAMA MODELİ ────────────────────────── */}
      <section id="pricing-preview" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <div className={styles.sectionBadge}>
            <IconBuilding size={14} />
            Kurumsal & Yatırımcı Modeli
          </div>
          <h2 className={styles.sectionTitle}>SaaS Abonelik & Lisans Paketleri</h2>
          <p className={styles.sectionDesc}>
            Vatandaşlar için her zaman ücretsiz olan platform, belediyeler ve kamu kurumları için
            yüksek verimli B2G (Belediyeden Devlete) abonelik modeliyle sürdürülebilir gelir yaratır.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginTop: '32px',
              marginBottom: '32px',
            }}
          >
            {[
              {
                name: 'Ücretsiz Vatandaş',
                price: '₺0',
                period: 'Süresiz',
                desc: 'Tüm vatandaşlar için sınırsız bildirim ve harita takibi',
                color: '#2563eb',
              },
              {
                name: 'Belediye Starter',
                price: '₺15.000',
                period: '/ ay',
                desc: 'İlçe belediyeleri için 5.000 sorun/ay, portal erişimi & e-posta/SMS',
                color: '#16a34a',
              },
              {
                name: 'Belediye Pro',
                price: '₺45.000',
                period: '/ ay',
                featured: true,
                desc: '153 Beyaz Masa Webhook, AI LLM Guard, SLA ve analitik raporlama',
                color: '#2563eb',
              },
              {
                name: 'Bakanlık Lisansı',
                price: 'Özel Fiyat',
                period: 'Kurumsal',
                desc: 'White-Label özel etiket, dedicated veritabanı ve sınırsız kapasite',
                color: '#7c3aed',
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  background: p.featured ? '#eff6ff' : '#ffffff',
                  border: p.featured ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {p.featured && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-11px',
                      right: '16px',
                      background: '#2563eb',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    EN POPÜLER
                  </span>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                  {p.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: p.color }}>{p.price}</span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{p.period}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link
              href="/pricing"
              className="btn btn-primary"
              style={{ display: 'inline-flex', padding: '12px 28px', fontSize: '15px', borderRadius: '12px' }}
            >
              Tüm Kurumsal Abonelik & Yatırımcı Özelliklerini İncele
              <IconArrowRight size={16} />
            </Link>
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
                <li><a href="#harita">Harita Görünümü</a></li>
                <li><Link href="/my-issues">Bildirimlerim</Link></li>
                <li><Link href="/pricing">Kurumsal Paketler</Link></li>
                <li><Link href="/register">Kayıt Ol</Link></li>
                <li><Link href="/login">Giriş Yap</Link></li>
                <li><Link href="/portal">Kurum Portalı</Link></li>
              </ul>
            </div>

            {/* Kurumsal */}
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Kurumsal</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#pricing-preview">Hakkımızda</a></li>
                <li><Link href="/pricing">SaaS Fiyatlandırma</Link></li>
                <li><a href="#iletisim">İletişim</a></li>
                <li><a href="#iletisim">Basın</a></li>
                <li><a href="#nasil-calisir">Nasıl Çalışır?</a></li>
                <li><Link href="/pricing">Yatırımcı Modeli</Link></li>
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
      <ReportModalClient />
    </div>
  );
}
