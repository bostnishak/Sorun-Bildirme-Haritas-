'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import styles from './TableView.module.css';
import { useIssues } from '@/hooks/useIssues';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICON_MAP,
  IconSearch, IconFilter, IconRefreshCw, IconMessageSquare,
  IconAlertCircle, IconClock, IconCheckCircle, IconMoreHorizontal,
} from '@/components/ui/Icon';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Açık', IN_REVIEW: 'İnceleniyor', RESOLVED: 'Çözüldü', REJECTED: 'Reddedildi',
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük',
};

const TR_CITIES = [
  'Adana', 'Ankara', 'Antalya', 'Bursa', 'Diyarbakır',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'İstanbul', 'İzmir',
  'Kahramanmaraş', 'Kayseri', 'Kocaeli', 'Konya', 'Malatya',
  'Mersin', 'Rize', 'Sakarya', 'Samsun', 'Trabzon', 'Van',
];

export function TableView() {
  const { filters, setFilter, clearFilters, selectIssue } = useAppStore();
  const { data: queryData, isLoading, isError } = useIssues(filters as any);
  const issues = queryData?.pages.flatMap(p => p.issues) || [];

  const filtered = useMemo(() => {
    return issues.filter(issue => {
      if (filters.city && issue.city !== filters.city) return false;
      if (filters.category && issue.category !== filters.category) return false;
      if (filters.status && issue.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          issue.title.toLowerCase().includes(q) ||
          issue.city.toLowerCase().includes(q) ||
          issue.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filters, issues]);

  return (
    <div className={styles.tableView}>
      {/* Stats Row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Toplam Bildirim', value: String(issues.length), sub: 'Gerçek zamanlı', color: 'var(--color-primary)', bg: 'rgba(29,78,216,0.1)', Icon: IconMessageSquare },
          { label: 'Açık', value: String(issues.filter(i => i.status === 'OPEN').length), sub: 'Acil / Yeni', color: 'var(--color-open)', bg: 'rgba(220,38,38,0.1)', Icon: IconAlertCircle },
          { label: 'İnceleniyor', value: String(issues.filter(i => i.status === 'IN_REVIEW').length), sub: 'İşleme Alındı', color: 'var(--color-in-review)', bg: 'rgba(217,119,6,0.1)', Icon: IconClock },
          { label: 'Çözüldü', value: String(issues.filter(i => i.status === 'RESOLVED').length), sub: 'Tamamlandı', color: 'var(--color-resolved)', bg: 'rgba(22,163,74,0.1)', Icon: IconCheckCircle },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: s.bg, color: s.color }}>
              <s.Icon size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statVal} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.statLbl}>{s.label}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={filters.city || ''}
          onChange={e => setFilter('city', e.target.value)}
        >
          <option value="">Tüm Şehirler</option>
          {TR_CITIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filters.category || ''}
          onChange={e => setFilter('category', e.target.value)}
        >
          <option value="">Tüm Sorun Türleri</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filters.status || ''}
          onChange={e => setFilter('status', e.target.value)}
        >
          <option value="">Tüm Durumlar</option>
          <option value="OPEN">Açık</option>
          <option value="IN_REVIEW">İnceleniyor</option>
          <option value="RESOLVED">Çözüldü</option>
          <option value="REJECTED">Reddedildi</option>
        </select>

        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Başlık, şehir veya ilçe ara..."
            value={filters.search || ''}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>

        <button className="btn btn-primary btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtrele
        </button>

        <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
          Temizle
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderLeft}>
            <div className={styles.tableIconWrap}>
              <IconMessageSquare size={18} />
            </div>
            <div>
              <h2 className={styles.tableTitle}>Sorun Bildirimleri</h2>
              <p className={styles.tableSubtitle}>Şehir, ilçe ve sorun türüne göre filtreleme yaparak kayıtları inceleyebilirsiniz.</p>
            </div>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Başlık</th>
                <th>Sorun Türü</th>
                <th>Şehir</th>
                <th>İlçe</th>
                <th>Durum</th>
                <th>Öncelik</th>
                <th>Oluşturma Tarihi</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(issue => (
                <tr
                  key={issue.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectIssue({
                    id: String(issue.id),
                    title: issue.title,
                    category: issue.category,
                    status: issue.status,
                    city: issue.city,
                    district: issue.district,
                    createdAt: issue.createdAt,
                    description: `${issue.title}. İlgili birimlerin inceleme ve müdahale süreci devam etmektedir.`,
                    priority: issue.priority,
                    address: `${issue.district}, ${issue.city}`,
                    latitude: issue.latitude,
                    longitude: issue.longitude,
                    upvotes: issue.upvoteCount,
                  } as any)}
                >
                  <td className={styles.idCell}>#{issue.id}</td>
                  <td className={styles.titleCell}>{issue.title}</td>
                  <td>
                    <span className={styles.categoryBadge} style={{ background: `${CATEGORY_COLORS[issue.category]}12`, color: CATEGORY_COLORS[issue.category] }}>
                      {(() => { const CatIcon = CATEGORY_ICON_MAP[issue.category]; return CatIcon ? <CatIcon size={12} /> : null; })()}
                      {CATEGORY_LABELS[issue.category]}
                    </span>
                  </td>
                  <td>{issue.city}</td>
                  <td>{issue.district}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status_${issue.status}`]}`}>
                      <span className={styles.statusDot} />
                      {STATUS_LABELS[issue.status]}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles[`priority_${issue.priority}`]}`}>
                      {PRIORITY_LABELS[issue.priority] || issue.priority}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {format(new Date(issue.createdAt || '2026-07-02T10:00:00Z'), 'dd MMM yyyy, HH:mm', { locale: tr })}
                  </td>
                  <td>
                    <button className={styles.moreBtn} onClick={e => { e.stopPropagation(); }}><IconMoreHorizontal size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <div className={styles.footerLeft}>
            <span className={styles.infiniteIcon}>∞</span>
            <span>Aşağı kaydırıldıkça yeni kayıtlar yüklenir</span>
          </div>
          <div className={styles.footerCenter}>
            {filtered.length} / {issues.length} kayıt gösteriliyor
          </div>
          <div className={styles.footerRight}>
            Son güncelleme: Canlı Veri
            <button className={styles.refreshBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
