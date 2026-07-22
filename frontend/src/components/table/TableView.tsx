'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import styles from './TableView.module.css';
import { useIssues, issueKeys } from '@/hooks/useIssues';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICON_MAP,
  IconMessageSquare,
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

const CATEGORY_PREFIX: Record<string, string> = {
  WATER_SANITATION: 'SU',
  TRANSPORTATION: 'UL',
  ENVIRONMENT: 'CE',
  INFRASTRUCTURE: 'AT',
  SECURITY: 'GV',
  LIGHTING: 'AY',
  PARKS: 'PK',
};

// ─── 1A: ID Kısaltma ──────────────────────────────────────────────────────────
// UUID'yi "PREFIX-XXXXXXXX" formatına çevirir (örn: SU-12442921)
// Veritabanındaki gerçek ID'ye hiç dokunulmaz — yalnızca görsel kısaltma
function shortId(issue: any): string {
  const prefix = CATEGORY_PREFIX[issue.category] || 'SB';
  const rawId = String(issue.id || '');
  // UUID veya normal string — ilk 8 karakteri al
  const short = rawId.replace(/-/g, '').substring(0, 8).toUpperCase();
  return `${prefix}-${short}`;
}

const TR_CITIES = Object.keys(TR_CITIES_DISTRICTS);

const TableRowItem = React.memo(({ issue, onSelect, onNavigate }: { issue: any; onSelect: (issue: any) => void; onNavigate: (id: string) => void }) => {
  const CatIcon = CATEGORY_ICON_MAP[issue.category];
  const short = shortId(issue);
  const addressStr = issue.address || `${issue.district}, ${issue.city}`;
  const formattedDate = format(new Date(issue.createdAt || '2026-07-02T10:00:00Z'), 'dd MMM yyyy, HH:mm', { locale: tr });

  return (
    <tr
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(issue)}
    >
      <td className={styles.idCell}>
        <span title={`Tam ID: ${issue.id}`} style={{ cursor: 'help' }}>
          {short}
        </span>
      </td>
      <td className={styles.titleCell}>{issue.title}</td>
      <td>
        <span className={styles.categoryBadge} style={{ background: `${CATEGORY_COLORS[issue.category]}12`, color: CATEGORY_COLORS[issue.category] }}>
          {CatIcon && <CatIcon size={12} />}
          {CATEGORY_LABELS[issue.category]}
        </span>
      </td>
      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={addressStr}>
        {addressStr}
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
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#E11D48', background: 'rgba(225, 29, 72, 0.08)', padding: '3px 8px', borderRadius: '12px', fontSize: '12px' }}>
          <span>❤️</span>
          <span>{issue.upvoteCount ?? issue.upvotes ?? 0}</span>
        </span>
      </td>
      <td className={styles.dateCell}>
        {formattedDate}
      </td>
      <td>
        <button
          className={styles.moreBtn}
          title="Detay Sayfasına Git"
          onClick={e => {
            e.stopPropagation();
            onNavigate(String(issue.id));
          }}
        >
          <IconMoreHorizontal size={14} />
        </button>
      </td>
    </tr>
  );
});
TableRowItem.displayName = 'TableRowItem';

export function TableView({ issues: initialIssues }: { issues?: any[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const filters = useAppStore(state => state.filters);
  const setFilter = useAppStore(state => state.setFilter);
  const clearFilters = useAppStore(state => state.clearFilters);
  const selectIssue = useAppStore(state => state.selectIssue);

  const { data: queryData, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useIssues(filters as any);
  const rawIssues = queryData?.pages.flatMap(p => p.issues) || initialIssues || MOCK_ISSUES;
  const issues = rawIssues;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== (filters.search || '')) {
        setFilter('search', localSearch);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, filters.search, setFilter]);

  const filtered = useMemo(() => {
    const result = issues.filter(issue => {
      if (filters.city && issue.city !== filters.city) return false;
      if (filters.category && issue.category !== filters.category) return false;
      if (filters.status && issue.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        const qNoDash = q.replace(/-/g, '');
        const short = shortId(issue).toLowerCase();
        const rawId = String(issue.id || '').toLowerCase();
        const rawIdNoDash = rawId.replace(/-/g, '');
        const title = (issue.title || '').toLowerCase();
        const desc = (issue.description || '').toLowerCase();
        const city = (issue.city || '').toLowerCase();
        const district = (issue.district || '').toLowerCase();
        const address = (issue.address || '').toLowerCase();
        const statusLabel = (STATUS_LABELS[issue.status] || '').toLowerCase();
        const catLabel = (CATEGORY_LABELS[issue.category] || '').toLowerCase();

        return (
          short.includes(q) ||
          short.replace(/-/g, '').includes(qNoDash) ||
          rawId.includes(q) ||
          rawIdNoDash.includes(qNoDash) ||
          title.includes(q) ||
          desc.includes(q) ||
          city.includes(q) ||
          district.includes(q) ||
          address.includes(q) ||
          statusLabel.includes(q) ||
          catLabel.includes(q)
        );
      }
      return true;
    });

    return result.sort((a, b) => {
      const sortKey = (filters as any).sortBy || '';
      if (sortKey === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      } else if (sortKey === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (sortKey === 'upvotes_desc') {
        return (b.upvoteCount ?? b.upvotes ?? 0) - (a.upvoteCount ?? a.upvotes ?? 0);
      } else if (sortKey === 'upvotes_asc') {
        return (a.upvoteCount ?? a.upvotes ?? 0) - (b.upvoteCount ?? b.upvotes ?? 0);
      } else {
        // '' -> Karışık / Varsayılan sıra (sıralama yapma)
        return 0;
      }
    });
  }, [filters, issues]);

  // ─── 1D: Refresh Butonu (gerçek invalidate) ───────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: issueKeys.all });
    setTimeout(() => setIsRefreshing(false), 800);
  }, [queryClient]);

  // ─── 1B: Premium Excel (.xlsx) ── ExcelJS ile Yönetici Raporu ────────────
  const handleDownloadExcel = useCallback(async () => {
    const dataToExport = filtered.length > 0 ? filtered : issues;
    if (dataToExport.length === 0) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }

    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Türkiye Sorun Bildirim Haritası';
      wb.created = new Date();

      // ── SAYFA 1: Ana Tablo (Sorun Bildirimleri) ─────────────────────────
      const ws = wb.addWorksheet('Sorun Bildirimleri', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      ws.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Başlık', key: 'title', width: 45 },
        { header: 'Sorun Türü', key: 'category', width: 22 },
        { header: 'Şehir', key: 'city', width: 16 },
        { header: 'İlçe', key: 'district', width: 18 },
        { header: 'Açık Adres', key: 'address', width: 42 },
        { header: 'Durum', key: 'status', width: 16 },
        { header: 'Öncelik', key: 'priority', width: 14 },
        { header: 'Oluşturma Tarihi', key: 'date', width: 18 },
        { header: 'Oluşturma Saati', key: 'time', width: 16 },
        { header: 'Destekleyen Sayısı', key: 'upvotes', width: 20 },
      ];

      // Başlık Satırını Biçimlendir (Sayfa 1)
      const headerRow = ws.getRow(1);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      dataToExport.forEach((issue, idx) => {
        const row = ws.addRow({
          id: shortId(issue),
          title: issue.title,
          category: CATEGORY_LABELS[issue.category] || issue.category,
          city: issue.city,
          district: issue.district,
          address: issue.address || `${issue.district}, ${issue.city}`,
          status: STATUS_LABELS[issue.status] || issue.status,
          priority: PRIORITY_LABELS[issue.priority] || issue.priority,
          date: format(new Date(issue.createdAt || Date.now()), 'dd.MM.yyyy'),
          time: format(new Date(issue.createdAt || Date.now()), 'HH:mm'),
          upvotes: issue.upvoteCount ?? issue.upvotes ?? 0,
        });
        row.height = 20;
        const isEven = idx % 2 === 0;
        row.eachCell((cell, colNum) => {
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (colNum === 1 || colNum === 7 || colNum === 8 || colNum === 9 || colNum === 10 || colNum === 11) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
        });
      });

      // ── SAYFA 2: Analiz & Grafikler ─────────────────────────────────────
      const wsAnalytics = wb.addWorksheet('Analiz & Grafikler');
      wsAnalytics.columns = [
        { key: 'A', width: 34 },
        { key: 'B', width: 18 },
        { key: 'C', width: 18 },
        { key: 'D', width: 45 },
        { key: 'E', width: 5 },
      ];

      // Banner row 1
      wsAnalytics.mergeCells('A1:D1');
      const titleCell = wsAnalytics.getCell('A1');
      titleCell.value = 'TÜRKİYE SORUN BİLDİRİM HARİTASI — YÖNETİCİ ANALİZ VE GRAFİK RAPORU';
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      wsAnalytics.getRow(1).height = 36;

      // Subtitle row 2
      wsAnalytics.mergeCells('A2:D2');
      const subCell = wsAnalytics.getCell('A2');
      subCell.value = `Rapor Tarihi: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: tr })}  |  Toplam Bildirim: ${dataToExport.length}  |  Kurumsal SLA Takibi`;
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      wsAnalytics.getRow(2).height = 22;

      const statusCounts = {
        'Açık': dataToExport.filter(i => i.status === 'OPEN').length,
        'İnceleniyor': dataToExport.filter(i => i.status === 'IN_REVIEW').length,
        'Çözüldü': dataToExport.filter(i => i.status === 'RESOLVED').length,
        'Reddedildi': dataToExport.filter(i => i.status === 'REJECTED').length,
      };

      const categoryCounts: Record<string, number> = {};
      dataToExport.forEach(i => {
        const label = CATEGORY_LABELS[i.category] || i.category;
        categoryCounts[label] = (categoryCounts[label] || 0) + 1;
      });

      const priorityCounts = {
        'Kritik': dataToExport.filter(i => i.priority === 'CRITICAL').length,
        'Yüksek': dataToExport.filter(i => i.priority === 'HIGH').length,
        'Orta': dataToExport.filter(i => i.priority === 'MEDIUM').length,
        'Düşük': dataToExport.filter(i => i.priority === 'LOW').length,
      };

      const cityCounts: Record<string, number> = {};
      dataToExport.forEach(i => {
        cityCounts[i.city] = (cityCounts[i.city] || 0) + 1;
      });
      const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

      // Row 4: KPI Özet Kartları (A4: Toplam, B4: Açık, C4: İnceleniyor, D4: Çözüldü)
      const kpiRow = wsAnalytics.getRow(4);
      kpiRow.height = 32;

      const setKpiCell = (col: string, label: string, val: number, bgHex: string, borderHex: string, fontHex: string) => {
        const cell = wsAnalytics.getCell(`${col}4`);
        cell.value = `${label}: ${val}`;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: fontHex } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: borderHex } },
          bottom: { style: 'medium', color: { argb: borderHex } },
          left: { style: 'medium', color: { argb: borderHex } },
          right: { style: 'medium', color: { argb: borderHex } },
        };
      };

      setKpiCell('A', 'TOPLAM BİLDİRİM', dataToExport.length, 'FFEFF6FF', 'FF3B82F6', 'FF1E40AF');
      setKpiCell('B', 'AÇIK (ACİL)', statusCounts['Açık'], 'FFFEE2E2', 'FFEF4444', 'FF991B1B');
      setKpiCell('C', 'İNCELENİYOR', statusCounts['İnceleniyor'], 'FFFEF3C7', 'FFF59E0B', 'FF92400E');
      setKpiCell('D', 'ÇÖZÜLDÜ (%' + (dataToExport.length > 0 ? Math.round((statusCounts['Çözüldü'] / dataToExport.length) * 100) : 0) + ')', statusCounts['Çözüldü'], 'FFDCFCE7', 'FF10B981', 'FF065F46');

      let currRow = 6;
      const addSectionTable = (title: string, dataEntries: [string, number][], barColorHex: string) => {
        wsAnalytics.mergeCells(`A${currRow}:D${currRow}`);
        const secCell = wsAnalytics.getCell(`A${currRow}`);
        secCell.value = title;
        secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        secCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        secCell.alignment = { vertical: 'middle', horizontal: 'left' };
        wsAnalytics.getRow(currRow).height = 24;
        currRow++;

        const thRow = wsAnalytics.getRow(currRow);
        thRow.height = 20;
        ['Kategori / Durum Adı', 'Adet', 'Oran (%)', 'Görsel Dağılım ve İlerleme Grafiği'].forEach((h, cIdx) => {
          const c = thRow.getCell(cIdx + 1);
          c.value = h;
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
          c.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : cIdx === 3 ? 'left' : 'center' };
          c.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
        });
        currRow++;

        const maxVal = Math.max(...dataEntries.map(e => e[1]), 1);
        dataEntries.forEach(([label, count], eIdx) => {
          const r = wsAnalytics.getRow(currRow);
          r.height = 20;
          const pct = dataToExport.length > 0 ? Math.round((count / dataToExport.length) * 100) : 0;
          const barLen = Math.round((count / maxVal) * 22);
          const visualBar = '█'.repeat(barLen) + '░'.repeat(22 - barLen) + `   (%${pct})`;

          r.getCell(1).value = label;
          r.getCell(2).value = count;
          r.getCell(3).value = `%${pct}`;
          r.getCell(4).value = visualBar;

          const isEven = eIdx % 2 === 0;
          [1, 2, 3, 4].forEach(cIdx => {
            const cell = r.getCell(cIdx);
            if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            cell.font = { name: 'Calibri', size: 10, color: { argb: cIdx === 4 ? barColorHex : 'FF1E293B' }, bold: cIdx === 4 || cIdx === 2 };
            cell.alignment = { vertical: 'middle', horizontal: cIdx === 1 || cIdx === 4 ? 'left' : 'center' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          });
          currRow++;
        });
        currRow++; // empty space
      };

      addSectionTable('── DURUM DAĞILIMI VE İLERLEME ANALİZİ ──', Object.entries(statusCounts), 'FF2563EB');
      addSectionTable('── KATEGORİ YOĞUNLUK VE ŞİKAYET TÜRLERİ ──', Object.entries(categoryCounts), 'FF0D9488');
      addSectionTable('── ÖNCELİK VE ACİLİYET DAĞILIMI ──', Object.entries(priorityCounts), 'FFD97706');
      addSectionTable('── EN FAZLA BİLDİRİM ALAN ŞEHİRLER (TOP 8) ──', topCities, 'FF4F46E5');

      // ── SAYFA 3: Özet ───────────────────────────────────────────────────
      const wsSummary = wb.addWorksheet('Özet İstatistikler');
      wsSummary.columns = [
        { key: 'A', width: 35 },
        { key: 'B', width: 28 },
      ];

      wsSummary.mergeCells('A1:B1');
      const sumTitle = wsSummary.getCell('A1');
      sumTitle.value = 'STRATEJİK PERFORMANS VE SLA ÖZET METRİKLERİ';
      sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      sumTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      sumTitle.alignment = { vertical: 'middle', horizontal: 'center' };
      wsSummary.getRow(1).height = 32;

      const totalUpvotes = dataToExport.reduce((acc, i) => acc + (i.upvoteCount ?? i.upvotes ?? 0), 0);
      const avgUpvotes = dataToExport.length > 0 ? Math.round(totalUpvotes / dataToExport.length) : 0;
      const resRate = dataToExport.length > 0 ? Math.round((statusCounts['Çözüldü'] / dataToExport.length) * 100) : 0;
      const critRate = dataToExport.length > 0 ? Math.round(((priorityCounts['Kritik'] + priorityCounts['Yüksek']) / dataToExport.length) * 100) : 0;

      const summaryItems = [
        ['Platform Adı', 'Türkiye Sorun Bildirim Haritası'],
        ['Raporlama Tarihi', format(new Date(), 'dd.MM.yyyy HH:mm:ss')],
        ['Toplam Bildirim Sayısı', `${dataToExport.length} Adet`],
        ['Açık (Müdahale Bekleyen)', `${statusCounts['Açık']} Adet (${Math.round((statusCounts['Açık']/Math.max(dataToExport.length,1))*100)}%)`],
        ['İnceleniyor (Süreçte)', `${statusCounts['İnceleniyor']} Adet (${Math.round((statusCounts['İnceleniyor']/Math.max(dataToExport.length,1))*100)}%)`],
        ['Çözülen (Tamamlanan)', `${statusCounts['Çözüldü']} Adet`],
        ['Genel Çözüm Başarı Oranı', `██████████░░  (%${resRate})`],
        ['Kritik/Yüksek Öncelik Yoğunluğu', `%${critRate} (Acil Müdahale Oranı)`],
        ['Toplam Vatandaş Destek (Upvote)', `${totalUpvotes} Destek`],
        ['Bildirim Başına Ortalama Destek', `${avgUpvotes} Destek/Bildirim`],
        ['Aktif Şehir Sayısı', `${Object.keys(cityCounts).length} İl`],
      ];

      summaryItems.forEach(([label, val], sIdx) => {
        const r = wsSummary.addRow([label, val]);
        r.height = 24;
        const isEven = sIdx % 2 === 0;
        [1, 2].forEach(cIdx => {
          const cell = r.getCell(cIdx);
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.font = { name: 'Calibri', size: 11, bold: cIdx === 2 || sIdx === 6, color: { argb: cIdx === 2 && sIdx === 6 ? 'FF16A34A' : 'FF1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: cIdx === 1 ? 'left' : 'right' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });

      // İndirme (Buffer write & Blob link)
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `Sorun_Bildirimleri_${format(new Date(), 'dd_MM_yyyy')}.xlsx`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel oluşturma hatası:', err);
      alert('Excel dosyası oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  }, [filtered, issues]);

  // ─── 1C: Premium PDF (.pdf) - UTF-8 / Türkçe Karakter Destekli ───────────
  const handleDownloadPDF = useCallback(async () => {
    const dataToExport = filtered.length > 0 ? filtered : issues;
    if (dataToExport.length === 0) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const now = new Date();

      // Türkçe karakter destekleyen Roboto fontunu yüklemeyi dene
      let fontName = 'helvetica';
      try {
        const [regRes, boldRes] = await Promise.all([
          fetch('/fonts/Roboto-Regular.ttf'),
          fetch('/fonts/Roboto-Bold.ttf')
        ]);
        if (regRes.ok && boldRes.ok) {
          const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
          };
          const regBuffer = await regRes.arrayBuffer();
          const boldBuffer = await boldRes.arrayBuffer();
          const regBase64 = arrayBufferToBase64(regBuffer);
          const boldBase64 = arrayBufferToBase64(boldBuffer);

          doc.addFileToVFS('Roboto-Regular.ttf', regBase64);
          doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
          doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
          doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
          fontName = 'Roboto';
        }
      } catch (fontErr) {
        console.warn('Roboto font yüklenemedi, varsayılan fonta geçildi:', fontErr);
      }

      // ── BAŞLIK BÖLÜMÜ ───────────────────────────────────────────────────
      doc.setFillColor(29, 78, 216);
      doc.rect(0, 0, pageW, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(fontName, 'bold');
      doc.text('TÜRKİYE SORUN BİLDİRİM HARİTASI', 14, 11);

      doc.setFontSize(9);
      doc.setFont(fontName, 'normal');
      doc.text('Resmi Veri Raporu — Tüm hakları saklıdır', 14, 17);

      doc.setFontSize(8);
      doc.text(`Rapor Tarihi: ${format(now, 'dd MMMM yyyy HH:mm', { locale: tr })}`, pageW - 14, 11, { align: 'right' });
      doc.text(`Toplam Kayıt: ${dataToExport.length}`, pageW - 14, 17, { align: 'right' });

      // ── ÖZET İSTATİSTİK KARTLARI ────────────────────────────────────────
      const statY = 34;
      const cardW = (pageW - 28 - 12) / 4;
      const statItems = [
        { label: 'Toplam', value: dataToExport.length, color: [29, 78, 216] as [number, number, number] },
        { label: 'Açık', value: dataToExport.filter(i => i.status === 'OPEN').length, color: [220, 38, 38] as [number, number, number] },
        { label: 'İnceleniyor', value: dataToExport.filter(i => i.status === 'IN_REVIEW').length, color: [217, 119, 6] as [number, number, number] },
        { label: 'Çözüldü', value: dataToExport.filter(i => i.status === 'RESOLVED').length, color: [22, 163, 74] as [number, number, number] },
      ];
      statItems.forEach((s, idx) => {
        const x = 14 + idx * (cardW + 4);
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.roundedRect(x, statY, cardW, 18, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(fontName, 'bold');
        doc.text(String(s.value), x + cardW / 2, statY + 10, { align: 'center' });
        doc.setFontSize(8.5);
        doc.setFont(fontName, 'normal');
        doc.text(s.label, x + cardW / 2, statY + 15, { align: 'center' });
      });

      // ── PASTA GRAFİK (Durum Dağılımı) ───────────────────────────────────
      const chartY = statY + 24;
      const total = dataToExport.length;
      const pieData = [
        { label: 'Açık', count: dataToExport.filter(i => i.status === 'OPEN').length, color: [220, 38, 38] as [number, number, number] },
        { label: 'İnceleniyor', count: dataToExport.filter(i => i.status === 'IN_REVIEW').length, color: [217, 119, 6] as [number, number, number] },
        { label: 'Çözüldü', count: dataToExport.filter(i => i.status === 'RESOLVED').length, color: [22, 163, 74] as [number, number, number] },
        { label: 'Reddedildi', count: dataToExport.filter(i => i.status === 'REJECTED').length, color: [107, 114, 128] as [number, number, number] },
      ].filter(d => d.count > 0);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont(fontName, 'bold');
      doc.text('Durum Dağılımı', 14, chartY);

      const pieR = 18;
      const pieCx = 14 + pieR + 2;
      const pieCy = chartY + 6 + pieR;
      let startAngle = -Math.PI / 2;

      if (total > 0) {
        pieData.forEach(seg => {
          const angle = (seg.count / total) * 2 * Math.PI;
          const endAngle = startAngle + angle;
          const midAngle = startAngle + angle / 2;

          doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
          const steps = Math.max(8, Math.floor(angle / (Math.PI / 12)));
          for (let s = 0; s <= steps; s++) {
            const a = startAngle + (angle * s) / steps;
          }
          (doc as any).setFillColor(seg.color[0], seg.color[1], seg.color[2]);
          doc.triangle(
            pieCx, pieCy,
            pieCx + pieR * Math.cos(startAngle), pieCy + pieR * Math.sin(startAngle),
            pieCx + pieR * Math.cos(midAngle), pieCy + pieR * Math.sin(midAngle),
            'F'
          );
          doc.triangle(
            pieCx, pieCy,
            pieCx + pieR * Math.cos(midAngle), pieCy + pieR * Math.sin(midAngle),
            pieCx + pieR * Math.cos(endAngle), pieCy + pieR * Math.sin(endAngle),
            'F'
          );

          startAngle = endAngle;
        });
      }

      let legendY = chartY + 4;
      pieData.forEach(seg => {
        doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
        doc.rect(pieCx + pieR + 4, legendY, 4, 3, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        doc.setFont(fontName, 'normal');
        const pct = total > 0 ? Math.round(seg.count / total * 100) : 0;
        doc.text(`${seg.label}: ${seg.count} (%${pct})`, pieCx + pieR + 10, legendY + 2.5);
        legendY += 6;
      });

      // ── BAR GRAFİK (Kategori Dağılımı) ──────────────────────────────────
      const barStartX = pageW / 2 - 10;
      const barChartW = pageW - barStartX - 14;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont(fontName, 'bold');
      doc.text('Kategori Dağılımı', barStartX, chartY);

      const catEntries = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
        label: label.length > 14 ? label.substring(0, 14) + '...' : label,
        count: dataToExport.filter(i => i.category === key).length,
      })).filter(e => e.count > 0).sort((a, b) => b.count - a.count);

      const maxCat = Math.max(...catEntries.map(e => e.count), 1);
      const barH = 32;
      const barBW = (barChartW - 4) / Math.max(catEntries.length, 1);
      const barColors: [number, number, number][] = [
        [29, 78, 216], [220, 38, 38], [22, 163, 74], [217, 119, 6],
        [107, 114, 128], [139, 92, 246], [236, 72, 153],
      ];
      catEntries.forEach((cat, idx) => {
        const bx = barStartX + idx * barBW;
        const bH = (cat.count / maxCat) * barH;
        const by = chartY + 4 + barH - bH;
        const col = barColors[idx % barColors.length];
        doc.setFillColor(col[0], col[1], col[2]);
        doc.rect(bx, by, barBW - 1, bH, 'F');
        doc.setFontSize(7);
        doc.setFont(fontName, 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(String(cat.count), bx + (barBW - 1) / 2, by - 1, { align: 'center' });
        const shortLabel = cat.label.length > 8 ? cat.label.substring(0, 8) : cat.label;
        doc.text(shortLabel, bx + (barBW - 1) / 2, chartY + 4 + barH + 3.5, { align: 'center' });
      });

      // ── ANA TABLO ────────────────────────────────────────────────────────
      const tableStartY = chartY + 4 + 32 + 10;

      autoTable(doc, {
        startY: tableStartY,
        head: [['ID', 'Başlık', 'Sorun Türü', 'Adres', 'Durum', 'Öncelik', 'Tarih']],
        body: dataToExport.map(issue => [
          shortId(issue),
          issue.title.length > 42 ? issue.title.substring(0, 42) + '...' : issue.title,
          CATEGORY_LABELS[issue.category] || issue.category,
          (issue.address || `${issue.district}, ${issue.city}`).length > 38
            ? (issue.address || `${issue.district}, ${issue.city}`).substring(0, 38) + '...'
            : (issue.address || `${issue.district}, ${issue.city}`),
          STATUS_LABELS[issue.status] || issue.status,
          PRIORITY_LABELS[issue.priority] || issue.priority,
          format(new Date(issue.createdAt || Date.now()), 'dd.MM.yy HH:mm'),
        ]),
        styles: {
          font: fontName,
          fontSize: 8,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [29, 78, 216],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [239, 246, 255],
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 55 },
          2: { cellWidth: 32 },
          3: { cellWidth: 50 },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 28, halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.text[0];
            if (val === 'Açık') data.cell.styles.textColor = [220, 38, 38];
            else if (val === 'İnceleniyor') data.cell.styles.textColor = [217, 119, 6];
            else if (val === 'Çözüldü') data.cell.styles.textColor = [22, 163, 74];
            else data.cell.styles.textColor = [107, 114, 128];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.text[0];
            if (val === 'Kritik') data.cell.styles.textColor = [220, 38, 38];
            else if (val === 'Yüksek') data.cell.styles.textColor = [217, 119, 6];
            else if (val === 'Orta') data.cell.styles.textColor = [29, 78, 216];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 14, right: 14 },
      });

      // ── GANTT SAYFASI ────────────────────────────────────────────────────
      doc.addPage('landscape');
      doc.setFillColor(29, 78, 216);
      doc.rect(0, 0, pageW, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(fontName, 'bold');
      doc.text('GANTT ÇİZELGESİ — İhbar Zaman Çizelgesi', 14, 13);

      const sorted = [...dataToExport].sort((a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      const ganttItems = sorted.slice(0, 25);

      if (ganttItems.length > 0) {
        const minDate = new Date(ganttItems[0].createdAt || Date.now()).getTime();
        const maxDate = new Date(ganttItems[ganttItems.length - 1].createdAt || Date.now()).getTime();
        const span = Math.max(maxDate - minDate, 86400000);

        const ganttStartX = 80;
        const ganttEndX = pageW - 14;
        const ganttBarW = ganttEndX - ganttStartX;
        const rowH = 6;
        let gy = 28;

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont(fontName, 'normal');
        doc.text(format(new Date(minDate), 'dd.MM.yy'), ganttStartX, gy - 2);
        doc.text(format(new Date(maxDate), 'dd.MM.yy'), ganttEndX, gy - 2, { align: 'right' });

        const STATUS_GANTT_COLOR: Record<string, [number, number, number]> = {
          OPEN: [220, 38, 38],
          IN_REVIEW: [217, 119, 6],
          RESOLVED: [22, 163, 74],
          REJECTED: [107, 114, 128],
        };

        ganttItems.forEach((issue, idx) => {
          const startMs = new Date(issue.createdAt || Date.now()).getTime();
          const startPct = (startMs - minDate) / span;
          const barX = ganttStartX + startPct * ganttBarW;
          const barLength = Math.max(8, ganttBarW * 0.04);
          const col = STATUS_GANTT_COLOR[issue.status] || [107, 114, 128];
          const isEven = idx % 2 === 0;

          doc.setFillColor(isEven ? 248 : 239, isEven ? 250 : 246, isEven ? 252 : 255);
          doc.rect(14, gy, pageW - 28, rowH - 0.5, 'F');

          doc.setTextColor(15, 23, 42);
          doc.setFontSize(6.5);
          doc.setFont(fontName, 'normal');
          const shortTitle = issue.title.length > 32 ? issue.title.substring(0, 32) + '…' : issue.title;
          doc.text(`${shortId(issue)} ${shortTitle}`, 15, gy + 3.8);

          doc.setFillColor(col[0], col[1], col[2]);
          doc.roundedRect(barX, gy + 1, barLength, rowH - 2.5, 1, 1, 'F');

          doc.setTextColor(col[0], col[1], col[2]);
          doc.setFontSize(6);
          doc.text(format(new Date(startMs), 'dd.MM'), barX + barLength + 1, gy + 3.5);

          gy += rowH;
        });

        gy += 4;
        doc.setFontSize(7.5);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Durum:', 14, gy);
        let lx = 34;
        Object.entries(STATUS_GANTT_COLOR).forEach(([key, col]) => {
          doc.setFillColor(col[0], col[1], col[2]);
          doc.rect(lx, gy - 3, 4, 3, 'F');
          doc.setFont(fontName, 'normal');
          doc.setTextColor(30, 41, 59);
          doc.text(STATUS_LABELS[key] || key, lx + 6, gy);
          lx += 30;
        });
      }

      // ── FOOTER ──────────────────────────────────────────────────────────
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(241, 245, 249);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont(fontName, 'normal');
        doc.text('Türkiye Sorun Bildirim Haritası — Gizli Rapor', 14, pageH - 3);
        doc.text(`Sayfa ${i} / ${pageCount}`, pageW - 14, pageH - 3, { align: 'right' });
      }

      doc.save(`Sorun_Bildirimleri_Raporu_${format(now, 'dd_MM_yyyy')}.pdf`);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      alert('PDF dosyası oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
  }, [filtered, issues]);

  const handleRowSelect = useCallback((issue: any) => {
    selectIssue({
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
    } as any);
  }, [selectIssue]);

  const handleRowNavigate = useCallback((id: string) => {
    router.push(`/issues/${id}`);
  }, [router]);

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

        <select
          className={styles.filterSelect}
          value={(filters as any).sortBy || ''}
          onChange={e => setFilter('sortBy' as any, e.target.value)}
          style={{ fontWeight: 600, color: 'var(--color-primary)', border: '1px solid rgba(29, 78, 216, 0.3)' }}
        >
          <option value="">Sıralama Seçiniz</option>
          <option value="newest">Tarih: En Yeni</option>
          <option value="oldest">Tarih: En Eski</option>
          <option value="upvotes_desc">Destek: En Çok</option>
          <option value="upvotes_asc">Destek: En Az</option>
        </select>

        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder="ID, başlık, detay, adres veya şehir ara..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
          />
        </div>

        {/* 1D: Filtrele butonu — filtreleri açıkça uygular (zaten onChange ile canlı filtre var) */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            // Filtreleme zaten onChange ile anlık çalışıyor.
            // Bu buton mevcut filtreleri yeniden uygular (kullanıcı geri bildirimi için)
            setFilter('search', filters.search || '');
          }}
        >
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
              <span>Excel İndir (.xlsx)</span>
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
                <th>Destek</th>
                <th>Oluşturma Tarihi</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visibleCount).map(issue => (
                <TableRowItem
                  key={issue.id}
                  issue={issue}
                  onSelect={handleRowSelect}
                  onNavigate={handleRowNavigate}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Lokal DOM Sayfalama Butonu */}
        {filtered.length > visibleCount && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setVisibleCount(prev => prev + 30)}
              style={{ minWidth: '180px', fontWeight: 600 }}
            >
              Daha Fazla Göster (+30)
            </button>
          </div>
        )}

        {/* 3E: Daha Fazla Yükle — gerçek pagination */}
        {hasNextPage && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={{ minWidth: '160px' }}
            >
              {isFetchingNextPage ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Yükleniyor...
                </span>
              ) : 'Daha Fazla Yükle (Sunucu)'}
            </button>
          </div>
        )}

        <div className={styles.tableFooter}>
          <div className={styles.footerLeft}>
            <span className={styles.infiniteIcon}>∞</span>
            <span>Aşağı kaydırıldıkça yeni kayıtlar yüklenir</span>
          </div>
          <div className={styles.footerCenter}>
            {Math.min(visibleCount, filtered.length)} / {filtered.length} kayıt gösteriliyor (Toplam: {issues.length})
          </div>
          <div className={styles.footerRight}>
            Son güncelleme: Canlı Veri
            {/* 1D: Refresh butonu — gerçek invalidate */}
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              title="Tabloyu Yenile"
              disabled={isRefreshing}
              style={{ opacity: isRefreshing ? 0.6 : 1 }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }}
              >
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
