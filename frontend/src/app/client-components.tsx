'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/useAppStore';
import { FilterSidebar } from '@/components/layout/FilterSidebar';
import { TableView } from '@/components/table/TableView';
import { ReportIssueForm } from '@/components/forms/ReportIssueForm';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { IconMessageSquare, IconCheckCircle, IconClock, IconMapPin } from '@/components/ui/Icon';
import styles from './page.module.css';

const MapView = dynamic(() => import('@/components/map/MapView').then(m => ({ default: m.MapView })), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}><div className={styles.mapSpinner} /></div>,
});

export function MapAreaClient() {
  const { activeView } = useAppStore();
  return (
    <div className={styles.appLayout}>
      <FilterSidebar />
      <main className={styles.mapArea}>
        {activeView === 'map' ? <MapView /> : <TableView />}
      </main>
    </div>
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
        { value: summaryStats?.totalCount ? summaryStats.totalCount.toLocaleString('tr-TR') : '12.458', label: 'Toplam Bildirim', Icon: IconMessageSquare, color: '#1d4ed8' },
        { value: summaryStats?.resolvedRate || '87%', label: 'Çözüm Oranı', Icon: IconCheckCircle, color: '#16a34a' },
        { value: summaryStats?.avgResponseHours || '48 Saat', label: 'Ortalama Yanıt Süresi', Icon: IconClock, color: '#d97706' },
        { value: summaryStats?.citiesCount || '81 İl', label: 'Kapsanan Şehir', Icon: IconMapPin, color: '#7c3aed' },
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
  const { isReportModalOpen, setReportModalOpen } = useAppStore();
  if (!isReportModalOpen) return null;
  return <ReportIssueForm onClose={() => setReportModalOpen(false)} />;
}
