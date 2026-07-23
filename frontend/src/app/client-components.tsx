'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { FilterSidebar } from '@/components/layout/FilterSidebar';
import { TableView } from '@/components/table/TableView';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  IconMessageSquare, IconCheckCircle, IconClock, IconMapPin,
  IconBuilding, IconUsers, IconZap, IconMail, IconGlobe, IconPlus
} from '@/components/ui/Icon';
import { MOCK_STATS } from '@/lib/mockData';
import styles from './page.module.css';

const MapView = dynamic(() => import('@/components/map/MapView').then(m => ({ default: m.MapView })), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}><div className={styles.mapSpinner} /></div>,
});

function MapAreaClientInner() {
  const activeView = useAppStore(state => state.activeView);
  const setActiveView = useAppStore(state => state.setActiveView);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const setReportModalOpen = useAppStore(state => state.setReportModalOpen);
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams?.get('view');
    if (viewParam === 'table' && activeView !== 'table') {
      setActiveView('table');
    } else if (viewParam === 'map' && activeView !== 'map') {
      setActiveView('map');
    }
  }, [searchParams, activeView, setActiveView]);

  return (
    <div className={styles.appLayout}>
      <FilterSidebar />
      <main className={styles.mapArea}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          visibility: activeView === 'map' ? 'visible' : 'hidden',
          opacity: activeView === 'map' ? 1 : 0,
          zIndex: activeView === 'map' ? 1 : -1,
          transition: 'opacity 0.2s ease',
        }}>
          <MapView />
        </div>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          visibility: activeView === 'table' ? 'visible' : 'hidden',
          opacity: activeView === 'table' ? 1 : 0,
          zIndex: activeView === 'table' ? 1 : -1,
          transition: 'opacity 0.2s ease',
          overflow: 'auto',
          backgroundColor: 'var(--color-bg)'
        }}>
          <TableView />
        </div>

      </main>
    </div>
  );
}

export function MapAreaClient() {
  return (
    <React.Suspense fallback={<div className={styles.appLayout} />}>
      <MapAreaClientInner />
    </React.Suspense>
  );
}

export function BigStatsClient() {
  const { data: summaryStats } = useQuery({
    queryKey: ['public-summary-stats'],
    queryFn: async () => {
      const res: any = await api.get('/issues/summary-stats');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className={styles.statsShowcaseNumbers}>
      {[
        { value: summaryStats?.totalCount ? summaryStats.totalCount.toLocaleString('tr-TR') : MOCK_STATS.total.toLocaleString('tr-TR'), label: 'Toplam Bildirim', Icon: IconMessageSquare, color: '#1d4ed8' },
        { value: summaryStats?.resolvedCount ? summaryStats.resolvedCount.toLocaleString('tr-TR') : MOCK_STATS.resolved.toLocaleString('tr-TR'), label: 'Çözülen Bildirim', Icon: IconCheckCircle, color: '#16a34a' },
        { value: '48 Saat', label: 'Ortalama Yanıt Süresi', Icon: IconClock, color: '#f59e0b' },
        { value: '81 İl', label: 'Kapsanan Şehir', Icon: IconMapPin, color: '#8b5cf6' },
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
  );
}

export function ReportModalClient() {
  const isReportModalOpen = useAppStore(state => state.isReportModalOpen);
  const setReportModalOpen = useAppStore(state => state.setReportModalOpen);
  if (!isReportModalOpen) return null;
  return <ReportIssueForm onClose={() => setReportModalOpen(false)} />;
}

export function IssueReportFabClient() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isReportModalOpen = useAppStore(state => state.isReportModalOpen);
  const selectedIssue = useAppStore(state => state.selectedIssue);
  const setReportModalOpen = useAppStore(state => state.setReportModalOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isAuthenticated || isReportModalOpen || Boolean(selectedIssue) || typeof document === 'undefined') return null;

  return createPortal(
    <button
      className={styles.issueReportFab}
      onClick={() => setReportModalOpen(true)}
      aria-label="Sorun Bildir"
    >
      <IconPlus size={20} strokeWidth={2.5} />
      <span className={styles.issueReportFabText}>Sorun Bildir</span>
    </button>,
    document.body
  );
}

const CONTACT_DATA = [
  {
    id: 'basin',
    title: 'Basın ve İletişim',
    desc: 'Basın mensupları ve medya kuruluşları için iletişim bilgileri. Görsel ve bilgi talepleriniz için aşağıdaki kanalları kullanabilirsiniz.',
    Icon: IconBuilding,
    color: '#1d4ed8',
    bgLight: 'rgba(29, 78, 216, 0.08)',
    items: [
      { type: 'email', value: 'basin@sorunharitasi.gov.tr', Icon: IconMail },
      { type: 'web', value: 'sorunharitasi.gov.tr/basin', Icon: IconGlobe },
    ],
  },
  {
    id: 'kurumsal',
    title: 'Kurumsal İşbirliği',
    desc: "Belediyeler, kamu kurumları ve STK'lar için entegrasyon ve kurumsal üyelik talepleri.",
    Icon: IconUsers,
    color: '#16a34a',
    bgLight: 'rgba(22, 163, 74, 0.08)',
    items: [
      { type: 'email', value: 'kurum@sorunharitasi.gov.tr', Icon: IconMail },
    ],
  },
  {
    id: 'teknik',
    title: 'Teknik Destek',
    desc: 'Platform kullanımı, teknik sorunlar ve API entegrasyonu konularında destek alın.',
    Icon: IconZap,
    color: '#7c3aed',
    bgLight: 'rgba(124, 58, 237, 0.08)',
    items: [
      { type: 'email', value: 'destek@sorunharitasi.gov.tr', Icon: IconMail },
    ],
  },
];

export function ContactSectionClient() {
  const [activeTab, setActiveTab] = useState('basin');
  const activeData = CONTACT_DATA.find(c => c.id === activeTab) || CONTACT_DATA[0];

  return (
    <div className={styles.contactSectionWrapper}>
      {/* DESKTOP VIEW: 3-column Grid */}
      <div className={styles.contactGridDesktop}>
        {CONTACT_DATA.map((c) => (
          <div key={c.id} className={styles.contactBox}>
            <div className={styles.contactBoxHeader}>
              <div className={styles.contactBoxIcon} style={{ color: c.color, background: c.bgLight }}>
                <c.Icon size={20} />
              </div>
              <h3 className={styles.contactBoxTitle}>{c.title}</h3>
            </div>
            <p className={styles.contactBoxDesc}>{c.desc}</p>
            <div className={styles.contactList}>
              {c.items.map((item, idx) => (
                <a
                  key={idx}
                  href={item.type === 'email' ? `mailto:${item.value}` : item.type === 'phone' ? `tel:${item.value}` : `https://${item.value}`}
                  target={item.type === 'web' ? '_blank' : undefined}
                  rel={item.type === 'web' ? 'noopener noreferrer' : undefined}
                  className={styles.contactItem}
                >
                  <span style={{ display: 'inline-flex', color: c.color }}>
                    <item.Icon size={16} />
                  </span>
                  <span>{item.value}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE VIEW: Single card with tabs under 'Bize Ulaşın' */}
      <div className={styles.contactMobileContainer}>
        <div className={styles.contactMobileCard}>
          <div className={styles.contactMobileHeader}>
            <div className={styles.contactMobileHeaderIcon}>
              <IconMail size={20} />
            </div>
            <div>
              <h3 className={styles.contactMobileTitle}>Bize Ulaşın</h3>
              <p className={styles.contactMobileSubtitle}>İletişime geçmek için bir kategori seçin</p>
            </div>
          </div>

          {/* Tab Selector Buttons */}
          <div className={styles.contactMobileTabs}>
            {CONTACT_DATA.map((c) => {
              const isActive = activeTab === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveTab(c.id)}
                  className={`${styles.contactMobileTabBtn} ${isActive ? styles.activeTabBtn : ''}`}
                  style={{
                    color: isActive ? c.color : undefined,
                    background: isActive ? c.bgLight : undefined,
                    borderColor: isActive ? c.color : 'transparent',
                  }}
                >
                  <c.Icon size={14} />
                  <span>{c.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className={styles.contactMobileContent}>
            <p className={styles.contactMobileContentDesc}>{activeData.desc}</p>
            <div className={styles.contactMobileList}>
              {activeData.items.map((item, idx) => (
                <a
                  key={idx}
                  href={item.type === 'email' ? `mailto:${item.value}` : item.type === 'phone' ? `tel:${item.value}` : `https://${item.value}`}
                  target={item.type === 'web' ? '_blank' : undefined}
                  rel={item.type === 'web' ? 'noopener noreferrer' : undefined}
                  className={styles.contactMobileItem}
                >
                  <span style={{ display: 'inline-flex', color: activeData.color }}>
                    <item.Icon size={14} />
                  </span>
                  <span>{item.value}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

