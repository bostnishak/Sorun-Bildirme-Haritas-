'use client';

import { useMemo, useCallback, useState } from 'react';
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

export function TableView({ issues: initialIssues }: { issues?: any[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { filters, setFilter, clearFilters, selectIssue } = useAppStore();
  const { data: queryData, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useIssues(filters as any);
  const rawIssues = queryData?.pages.flatMap(p => p.issues) || initialIssues || MOCK_ISSUES;
  const issues = rawIssues;
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // ─── 1D: Refresh Butonu (gerçek invalidate) ───────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: issueKeys.all });
    setTimeout(() => setIsRefreshing(false), 800);
  }, [queryClient]);

  // ─── 1B: Premium Excel (.xlsx) ────────────────────────────────────────────
  const handleDownloadExcel = useCallback(async () => {
    const dataToExport = filtered.length > 0 ? filtered : issues;
    if (dataToExport.length === 0) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }

    try {
      // Dynamic import — Next.js SSR güvenli
      const XLSX = (await import('xlsx')).default;

      // ── SAYFA 1: Ana Tablo ──────────────────────────────────────────────
      const tableData = dataToExport.map(issue => ({
        'ID': shortId(issue),
        'Başlık': issue.title,
        'Sorun Türü': CATEGORY_LABELS[issue.category] || issue.category,
        'Şehir': issue.city,
        'İlçe': issue.district,
        'Açık Adres': issue.address || `${issue.district}, ${issue.city}`,
        'Durum': STATUS_LABELS[issue.status] || issue.status,
        'Öncelik': PRIORITY_LABELS[issue.priority] || issue.priority,
        'Oluşturma Tarihi': format(new Date(issue.createdAt || Date.now()), 'dd.MM.yyyy'),
        'Oluşturma Saati': format(new Date(issue.createdAt || Date.now()), 'HH:mm'),
        'Destekleyen Sayısı': issue.upvoteCount || 0,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(tableData);

      // Sütun genişlikleri
      ws['!cols'] = [
        { wch: 14 }, { wch: 45 }, { wch: 20 }, { wch: 14 },
        { wch: 16 }, { wch: 35 }, { wch: 14 }, { wch: 12 },
        { wch: 16 }, { wch: 14 }, { wch: 18 },
      ];

      // Başlık satırı stili
      const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
          fill: { fgColor: { rgb: '1D4ED8' } },
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            bottom: { style: 'medium', color: { rgb: '1E40AF' } },
          },
        };
      }

      // Veri satırları stili (zebra + durum rengi)
      const STATUS_BG: Record<string, string> = {
        'Açık': 'FEE2E2',
        'İnceleniyor': 'FEF3C7',
        'Çözüldü': 'DCFCE7',
        'Reddedildi': 'F1F5F9',
      };
      const PRIORITY_BG: Record<string, string> = {
        'Kritik': 'FEE2E2',
        'Yüksek': 'FEF3C7',
        'Orta': 'EFF6FF',
        'Düşük': 'F0FDF4',
      };

      for (let row = 1; row <= dataToExport.length; row++) {
        const isEven = row % 2 === 0;
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddr]) continue;
          const colHeader = tableData[0] ? Object.keys(tableData[0])[col] : '';
          const cellVal = String(ws[cellAddr].v || '');
          let bgColor = isEven ? 'EFF6FF' : 'FFFFFF';
          if (colHeader === 'Durum' && STATUS_BG[cellVal]) bgColor = STATUS_BG[cellVal];
          if (colHeader === 'Öncelik' && PRIORITY_BG[cellVal]) bgColor = PRIORITY_BG[cellVal];
          ws[cellAddr].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { sz: 10 },
            alignment: { vertical: 'center', wrapText: false },
            border: {
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } },
            },
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Sorun Bildirimleri');

      // ── SAYFA 2: Analiz & İstatistik ────────────────────────────────────
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
      const top10Cities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 10);

      const analyticsRows: any[][] = [
        ['SORUN BİLDİRİM HARİTASI — ANALİZ RAPORU', '', '', '', ''],
        [`Rapor Tarihi: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: tr })}`, '', '', '', ''],
        [`Toplam Kayıt: ${dataToExport.length}`, '', '', '', ''],
        [],
        ['── DURUM DAĞILIMI ──', '', '── KATEGORİ DAĞILIMI ──', '', '── ÖNCELİK DAĞILIMI ──'],
        ['Durum', 'Adet', 'Kategori', 'Adet', 'Öncelik', 'Adet'],
        ...(() => {
          const statusArr = Object.entries(statusCounts);
          const catArr = Object.entries(categoryCounts);
          const priArr = Object.entries(priorityCounts);
          const maxLen = Math.max(statusArr.length, catArr.length, priArr.length);
          return Array.from({ length: maxLen }, (_, i) => [
            statusArr[i]?.[0] || '', statusArr[i]?.[1] || '',
            catArr[i]?.[0] || '', catArr[i]?.[1] || '',
            priArr[i]?.[0] || '', priArr[i]?.[1] || '',
          ]);
        })(),
        [],
        ['── TOP 10 ŞEHİR ──', ''],
        ['Şehir', 'Bildirim Sayısı'],
        ...top10Cities.map(([city, count]) => [city, count]),
        [],
        ['── ÇÖZÜM ORANI ──', ''],
        ['Çözülen / Toplam', `${statusCounts['Çözüldü']} / ${dataToExport.length}`],
        ['Çözüm Oranı %', dataToExport.length > 0 ? `%${Math.round(statusCounts['Çözüldü'] / dataToExport.length * 100)}` : '%0'],
      ];

      const wsAnalytics = XLSX.utils.aoa_to_sheet(analyticsRows);
      wsAnalytics['!cols'] = [
        { wch: 30 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      ];
      // Başlık stilleri
      if (wsAnalytics['A1']) wsAnalytics['A1'].s = {
        font: { bold: true, sz: 14, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'EFF6FF' } },
      };
      XLSX.utils.book_append_sheet(wb, wsAnalytics, 'Analiz & Grafikler');

      // ── SAYFA 3: Özet ───────────────────────────────────────────────────
      const summaryRows = [
        ['ÖZET İSTATİSTİKLER', ''],
        [],
        ['Toplam Bildirim', dataToExport.length],
        ['Açık', statusCounts['Açık']],
        ['İnceleniyor', statusCounts['İnceleniyor']],
        ['Çözüldü', statusCounts['Çözüldü']],
        ['Reddedildi', statusCounts['Reddedildi']],
        [],
        ['Çözüm Oranı', dataToExport.length > 0 ? `${Math.round(statusCounts['Çözüldü'] / dataToExport.length * 100)}%` : '0%'],
        ['Rapor Tarihi', format(new Date(), 'dd.MM.yyyy HH:mm')],
        ['Platform', 'Türkiye Sorun Bildirim Haritası'],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 28 }, { wch: 20 }];
      if (wsSummary['A1']) wsSummary['A1'].s = {
        font: { bold: true, sz: 13, color: { rgb: '1D4ED8' } },
        fill: { fgColor: { rgb: 'EFF6FF' } },
      };
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet');

      // Dışa aktar
      XLSX.writeFile(wb, `Sorun_Bildirimleri_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    } catch (err) {
      console.error('Excel oluşturma hatası:', err);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  }, [filtered, issues]);

  // ─── 1C: Premium PDF ──────────────────────────────────────────────────────
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

      // ── BAŞLIK BÖLÜMÜ ───────────────────────────────────────────────────
      // Gradient arka plan (gradient yok, solid kullan)
      doc.setFillColor(29, 78, 216);
      doc.rect(0, 0, pageW, 28, 'F');

      // Platform adı
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TÜRKIYE SORUN BİLDİRİM HARİTASI', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Resmi Veri Raporu — Tüm hakları saklıdır', 14, 17);

      // Sağ üst: tarih
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
        doc.setFont('helvetica', 'bold');
        doc.text(String(s.value), x + cardW / 2, statY + 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
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

      // Pasta Grafik Başlığı
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
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
          // jsPDF arc workaround: approximate with lines
          const steps = Math.max(8, Math.floor(angle / (Math.PI / 12)));
          const points: number[] = [pieCx, pieCy];
          for (let s = 0; s <= steps; s++) {
            const a = startAngle + (angle * s) / steps;
            points.push(pieCx + pieR * Math.cos(a));
            points.push(pieCy + pieR * Math.sin(a));
          }
          // Draw filled pie slice
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

      // Legend (pasta grafik açıklaması)
      let legendY = chartY + 4;
      pieData.forEach(seg => {
        doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
        doc.rect(pieCx + pieR + 4, legendY, 4, 3, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        const pct = total > 0 ? Math.round(seg.count / total * 100) : 0;
        doc.text(`${seg.label}: ${seg.count} (%${pct})`, pieCx + pieR + 10, legendY + 2.5);
        legendY += 6;
      });

      // ── BAR GRAFİK (Kategori Dağılımı) ──────────────────────────────────
      const barStartX = pageW / 2 - 10;
      const barChartW = pageW - barStartX - 14;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Kategori Dağılımı', barStartX, chartY);

      const catEntries = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
        label: label.length > 12 ? label.substring(0, 12) + '.' : label,
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
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(String(cat.count), bx + (barBW - 1) / 2, by - 1, { align: 'center' });
        // Kısaltılmış etiket
        const shortLabel = cat.label.length > 6 ? cat.label.substring(0, 6) : cat.label;
        doc.text(shortLabel, bx + (barBW - 1) / 2, chartY + 4 + barH + 3, { align: 'center' });
      });

      // ── ANA TABLO ────────────────────────────────────────────────────────
      const tableStartY = chartY + 4 + 32 + 10;

      autoTable(doc, {
        startY: tableStartY,
        head: [['ID', 'Başlık', 'Sorun Türü', 'Adres', 'Durum', 'Öncelik', 'Tarih']],
        body: dataToExport.map(issue => [
          shortId(issue),
          issue.title.length > 40 ? issue.title.substring(0, 40) + '...' : issue.title,
          CATEGORY_LABELS[issue.category] || issue.category,
          (issue.address || `${issue.district}, ${issue.city}`).length > 35
            ? (issue.address || `${issue.district}, ${issue.city}`).substring(0, 35) + '...'
            : (issue.address || `${issue.district}, ${issue.city}`),
          STATUS_LABELS[issue.status] || issue.status,
          PRIORITY_LABELS[issue.priority] || issue.priority,
          format(new Date(issue.createdAt || Date.now()), 'dd.MM.yy HH:mm'),
        ]),
        headStyles: {
          fillColor: [29, 78, 216],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.5,
        },
        alternateRowStyles: {
          fillColor: [239, 246, 255],
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 55 },
          2: { cellWidth: 28 },
          3: { cellWidth: 50 },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 28, halign: 'center' },
        },
        didParseCell: (data: any) => {
          // Durum renklendirme
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.text[0];
            if (val === 'Açık') data.cell.styles.textColor = [220, 38, 38];
            else if (val === 'İnceleniyor') data.cell.styles.textColor = [217, 119, 6];
            else if (val === 'Çözüldü') data.cell.styles.textColor = [22, 163, 74];
            else data.cell.styles.textColor = [107, 114, 128];
            data.cell.styles.fontStyle = 'bold';
          }
          // Öncelik renklendirme
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
      doc.setFont('helvetica', 'bold');
      doc.text('GANTl ÇİZELGESİ — İhbar Zaman Çizelgesi', 14, 13);

      // Zaman aralığı hesapla
      const sorted = [...dataToExport].sort((a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      const ganttItems = sorted.slice(0, 25); // Max 25 ihbar

      if (ganttItems.length > 0) {
        const minDate = new Date(ganttItems[0].createdAt || Date.now()).getTime();
        const maxDate = new Date(ganttItems[ganttItems.length - 1].createdAt || Date.now()).getTime();
        const span = Math.max(maxDate - minDate, 86400000); // min 1 gün

        const ganttStartX = 80;
        const ganttEndX = pageW - 14;
        const ganttBarW = ganttEndX - ganttStartX;
        const rowH = 6;
        let gy = 28;

        // Zaman ekseni başlık
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
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

          // Arka plan
          doc.setFillColor(isEven ? 248 : 239, isEven ? 250 : 246, isEven ? 252 : 255);
          doc.rect(14, gy, pageW - 28, rowH - 0.5, 'F');

          // İhbar adı (sol)
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          const shortTitle = issue.title.length > 30 ? issue.title.substring(0, 30) + '…' : issue.title;
          doc.text(`${shortId(issue)} ${shortTitle}`, 15, gy + 3.8);

          // Gantt çubuğu
          doc.setFillColor(col[0], col[1], col[2]);
          doc.roundedRect(barX, gy + 1, barLength, rowH - 2.5, 1, 1, 'F');

          // Tarih etiketi
          doc.setTextColor(col[0], col[1], col[2]);
          doc.setFontSize(5.5);
          doc.text(format(new Date(startMs), 'dd.MM'), barX + barLength + 1, gy + 3.5);

          gy += rowH;
        });

        // Legend
        gy += 4;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Durum:', 14, gy);
        let lx = 34;
        Object.entries(STATUS_GANTT_COLOR).forEach(([key, col]) => {
          doc.setFillColor(col[0], col[1], col[2]);
          doc.rect(lx, gy - 3, 4, 3, 'F');
          doc.setFont('helvetica', 'normal');
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
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text('Türkiye Sorun Bildirim Haritası — Gizli Rapor', 14, pageH - 3);
        doc.text(`Sayfa ${i} / ${pageCount}`, pageW - 14, pageH - 3, { align: 'right' });
      }

      doc.save(`Sorun_Bildirimleri_Raporu_${format(now, 'dd_MM_yyyy')}.pdf`);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      alert('PDF dosyası oluşturulurken bir hata oluştu.');
    }
  }, [filtered, issues]);

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
                  {/* 1A: Kısaltılmış ID */}
                  <td className={styles.idCell}>
                    <span title={`Tam ID: ${issue.id}`} style={{ cursor: 'help' }}>
                      {shortId(issue)}
                    </span>
                  </td>
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
              ) : 'Daha Fazla Yükle'}
            </button>
          </div>
        )}

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
