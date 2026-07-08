'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { IconCheckCircle, IconBuilding, IconBarChart, IconArrowRight } from '@/components/ui/Icon';
import styles from './page.module.css';

interface PricingPlan {
  id: string;
  name: string;
  target: string;
  price: string;
  period: string;
  featured?: boolean;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

const PLANS: PricingPlan[] = [
  {
    id: 'citizen',
    name: 'Ücretsiz Vatandaş',
    target: 'Tüm Türkiye Cumhuriyeti Vatandaşları',
    price: '₺0',
    period: 'Süresiz Ücretsiz',
    features: [
      'Tüm Türkiye genelinde sınırsız sorun bildirme',
      'Anlık harita üzerinde durum ve konum takibi',
      'Belediye resmi yanıtlarını görüntüleme ve yorumlama',
      'NVİ kimlik doğrulaması ile güvenli vatandaş hesabı',
      'PWA mobil uygulama desteği',
    ],
    ctaText: 'Hemen Bildirim Yap',
    ctaLink: '/',
  },
  {
    id: 'starter',
    name: 'Belediye Starter',
    target: 'İlçe ve Küçük Ölçekli Belediyeler',
    price: '₺15.000',
    period: '/ ay (Yıllık Sözleşme)',
    features: [
      'Kurumsal Yönetim Portalı (/portal erişimi)',
      'Ayda 5.000 adet sınırsız coğrafi sorun işleme',
      'E-posta ve SMS otomatik bildirim sistemi',
      'Standart istatistik ve şehir performans raporu',
      'Mesai saatleri içinde teknik destek (SLA %99.5)',
    ],
    ctaText: 'Paketi Seç & Kurumsal Başvuru',
    ctaLink: '#contact',
  },
  {
    id: 'pro',
    name: 'Belediye Pro',
    target: 'Büyükşehir ve İl Belediyeleri',
    price: '₺45.000',
    period: '/ ay (Yıllık Sözleşme)',
    featured: true,
    features: [
      'Starter paketindeki tüm kurumsal özellikler',
      '153 Beyaz Masa & Akıllı Şehir Webhook Entegrasyonu',
      'AI LLM Guard küfür, sahte görsel ve içerik denetimi',
      'PDF / Excel detaylı analitik veri dökümü',
      'Öncelikli 7/24 kurumsal destek & Özel Çağrı Yöneticisi',
      'PostGIS coğrafi sınır (Geofencing) analizi',
    ],
    ctaText: 'Pro Pakete Geç',
    ctaLink: '#contact',
  },
  {
    id: 'enterprise',
    name: 'Bakanlık & İBB Lisansı',
    target: 'Bakanlıklar, Valilikler ve Büyükşehir Kurumları',
    price: 'Özel Fiyat',
    period: 'Kurumsal Lisanslama',
    features: [
      'Kurum logolu White-Label özel etiketli arayüz',
      'Sınırsız bildirim ve vatandaş işlem kapasitesi',
      'Dedicated (Özel) PostgreSQL/PostGIS veritabanı clusterı',
      'Kurum içi sunuculara (On-Premise) kurulum seçeneği',
      'Özel yapay zeka eğitilmiş kentsel tahmin modelleri',
    ],
    ctaText: 'Kurumsal Temsilciyle Görüş',
    ctaLink: '#contact',
  },
];

export default function PricingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    setModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />

      <main className={styles.container}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.badge}>
            <IconBuilding size={14} />
            Yatırımcı & Kurumsal B2G SaaS Modeli
          </div>
          <h1 className={styles.title}>
            Akıllı Şehirler İçin Ölçeklenebilir<br />SaaS Abonelik ve Lisans Paketleri
          </h1>
          <p className={styles.subtitle}>
            Türkiye Sorun Bildirim Haritası (ChaosMind), vatandaşlara ücretsiz sunulurken belediyeler,
            kamu kurumları ve veri abonelerine kurumsal B2G SaaS abonelik modeliyle yüksek sürdürülebilir gelir sağlar.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className={styles.grid}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.featured ? styles.featured : ''}`}
            >
              {plan.featured && (
                <div className={styles.featuredBadge}>EN ÇOK TERCİH EDİLEN</div>
              )}

              <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planTarget}>{plan.target}</div>
                <div className={styles.pricingWrap}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
                </div>
              </div>

              <ul className={styles.featureList}>
                {plan.features.map((feat, idx) => (
                  <li key={idx} className={styles.featureItem}>
                    <span className={styles.featureIcon}>
                      <IconCheckCircle size={16} />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.cardAction}>
                <button
                  className={`${styles.actionBtn} ${plan.featured ? styles.btnPrimary : styles.btnSecondary}`}
                  onClick={() => handleSelectPlan(plan.name)}
                >
                  {plan.ctaText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Investor Executive Showcase */}
        <div className={styles.investorSection}>
          <div className={styles.investorContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
              <IconBarChart size={16} />
              YATIRIMCI GÖRÜNÜMÜ & B2G ÖLÇEKLENME
            </div>
            <h2 className={styles.investorTitle}>
              Neden B2G SaaS (Belediyeden Devlete) Modeli?
            </h2>
            <p className={styles.investorDesc}>
              Türkiye’de 1.390’ın üzerinde belediye bulunmaktadır. Sadece %10 belediye penetrasyonu ile
              yıllık tekrarlayan gelir (ARR) hedefi 70+ Milyon TL seviyesindedir. Kurumsal 153 Beyaz Masa
              ve yapay zeka denetim modüllerimiz müşteri tutma (Retention) oranını %98 seviyesine taşır.
            </p>

            <div className={styles.investorMetrics}>
              <div className={styles.metricBox}>
                <div className={styles.metricVal}>%85+</div>
                <div className={styles.metricLbl}>Brüt Kar Marjı</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricVal}>1.390+</div>
                <div className={styles.metricLbl}>Hedef Belediye</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricVal}>₺72M+</div>
                <div className={styles.metricLbl}>Yıllık ARR Hedefi</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '240px' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '14px 24px', fontSize: '15px', borderRadius: '12px' }}
              onClick={() => handleSelectPlan('Yatırımcı & Kurumsal Görüşme')}
            >
              Yatırımcı Deck İste
              <IconArrowRight size={16} />
            </button>
            <Link
              href="/"
              style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '13px', textDecoration: 'underline' }}
            >
              Canlı Haritaya Geri Dön
            </Link>
          </div>
        </div>
      </main>

      {/* Demo Request Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Kurumsal Başvuru & Demo Talep
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              Seçilen Paket: <strong style={{ color: '#2563eb' }}>{selectedPlan}</strong>
            </p>

            <form onSubmit={e => { e.preventDefault(); alert('Kurumsal demo talebiniz alındı! Müşteri ilişkileri yöneticimiz sizinle iletişime geçecektir.'); setModalOpen(false); }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Kurum / Belediye Adı</label>
                <input required type="text" placeholder="Örn: Kadıköy Belediyesi / Yatırımcı Fonu" className="input" style={{ width: '100%', padding: '10px 14px' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Yetkili E-posta Adresi</label>
                <input required type="email" placeholder="kurum@belediye.bel.tr" className="input" style={{ width: '100%', padding: '10px 14px' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>İletişim Notunuz</label>
                <textarea rows={3} placeholder="153 Beyaz Masa entegrasyonu ve kurumsal lisanslama hakkında detaylı bilgi almak istiyoruz..." className="input" style={{ width: '100%', padding: '10px 14px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                >
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  Talebi Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
