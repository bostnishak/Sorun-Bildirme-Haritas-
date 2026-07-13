'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { TR_CITIES_DISTRICTS } from '@/lib/turkeyCities';
import { MOCK_ISSUES } from '@/lib/mockData';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Açık', IN_REVIEW: 'İnceleniyor', RESOLVED: 'Çözüldü', REJECTED: 'Reddedildi',
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük',
};

const TR_CITIES = Object.keys(TR_CITIES_DISTRICTS);

export function TableView({ issues: initialIssues }: { issues?: any[] }) {
  const router = useRouter();
  const { filters, setFilter, clearFilters, selectIssue } = useAppStore();
  const { data: queryData, isLoading, isError } = useIssues(filters as any);
  const rawIssues = queryData?.pages.flatMap(p => p.issues) || initialIssues || MOCK_ISSUES;
  const issues = rawIssues;

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

  const handleDownloadExcel = () => {
    const dataToExport = filtered.length > 0 ? filtered : issues;
    if (dataToExport.length === 0) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }

    const headers = ['ID', 'Başlık', 'Sorun Türü', 'Açık Adres', 'Durum', 'Öncelik', 'İhbar Tarihi', 'İhbar Saati'];
    const rows = dataToExport.map(issue => [
      `"#${issue.id}"`,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${CATEGORY_LABELS[issue.category] || issue.category}"`,
      `"${(issue.address || `${issue.district}, ${issue.city}`).replace(/"/g, '""')}"`,
      `"${STATUS_LABELS[issue.status] || issue.status}"`,
      `"${PRIORITY_LABELS[issue.priority] || issue.priority}"`,
      `" ${format(new Date(issue.createdAt || Date.now()), 'dd.MM.yyyy')} "`,
      `" ${format(new Date(issue.createdAt || Date.now()), 'HH:mm')} "`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sorun_Bildirimleri_Raporu_${format(new Date(), 'dd_MM_yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const dataToExport = filtered.length > 0 ? filtered : issues;
    if (dataToExport.length === 0) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRowsHtml = dataToExport.map(issue => `
      <tr>
        <td>#${issue.id}</td>
        <td><strong>${issue.title}</strong></td>
        <td>${CATEGORY_LABELS[issue.category] || issue.category}</td>
        <td>${issue.address || `${issue.district}, ${issue.city}`}</td>
        <td><span style="font-weight: bold; color: ${issue.status === 'OPEN' ? '#dc2626' : issue.status === 'IN_REVIEW' ? '#d97706' : '#16a34a'}">${STATUS_LABELS[issue.status] || issue.status}</span></td>
        <td>${PRIORITY_LABELS[issue.priority] || issue.priority}</td>
        <td>${format(new Date(issue.createdAt || Date.now()), 'dd.MM.yyyy HH:mm')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sorun Bildirim Haritası - PDF Raporu</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; }
          .title { font-size: 22px; font-weight: bold; color: #1d4ed8; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">TÜRKİYE SORUN BİLDİRİM HARİTASI</div>
          <div class="subtitle">Girilen Veriler ve Sorun Bildirim Raporu - ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: tr })}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Başlık</th>
              <th>Sorun Türü</th>
              <th>Açık Adres</th>
              <th>Durum</th>
              <th>Öncelik</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Toplam ${dataToExport.length} kayıt listelenmiştir. Rapor oluşturma tarihi: ${format(new Date(), 'dd.MM.yyyy HH:mm')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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

          <div className={styles.tableHeaderRight}>
            <button
              type="button"
              className={`${styles.exportBtn} ${styles.exportExcel}`}
              onClick={handleDownloadExcel}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
                <line x1="8" y1="17" x2="16" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>Excel İndir (.csv)</span>
            </button>

            <button
              type="button"
              className={`${styles.exportBtn} ${styles.exportPdf}`}
              onClick={handleDownloadPDF}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v14a2 2 0 0 0 2 2h14"/>
                <path d="M18 22V8a2 2 0 0 0-2-2H2"/>
                <path d="M18 2h4l-4 4"/>
              </svg>
              <span>PDF İndir (.pdf)</span>
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Başlık</th>
                <th>Sorun Türü</th>
                <th>Açık Adres</th>
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
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={issue.address || `${issue.district}, ${issue.city}`}>
                    {issue.address || `${issue.district}, ${issue.city}`}
                  </td>
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
                    <button
                      className={styles.moreBtn}
                      title="Detay Sayfasına Git"
                      onClick={e => {
                        e.stopPropagation();
                        router.push(`/issues/${issue.id}`);
                      }}
                    >
                      <IconMoreHorizontal size={14} />
                    </button>
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
