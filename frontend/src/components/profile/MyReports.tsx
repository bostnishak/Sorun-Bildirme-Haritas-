import React, { useMemo } from 'react';
import { IconFileText, IconAlertCircle, IconClock, IconCheckCircle } from '@/components/ui/Icon';
import styles from '@/app/profile/Profile.module.css';

const sampleReports = [
  {
    id: 1,
    title: 'Dikmen Caddesi Su Patlağı',
    type: 'Altyapı',
    address: 'Dikmen Caddesi No: 42',
    district: 'Çankaya',
    city: 'Ankara',
    fullAddress: 'Dikmen Caddesi No: 42, Çankaya, Ankara',
    latitude: 39.8839,
    longitude: 32.8428,
    status: 'İnceleniyor',
    priority: 'Kritik',
    date: '13 Tem 2026, 12:51',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Turan Güneş Bulvarı Çukur',
    type: 'Yol / Ulaşım',
    address: 'Turan Güneş Bulvarı',
    district: 'Çankaya',
    city: 'Ankara',
    fullAddress: 'Turan Güneş Bulvarı, Çankaya, Ankara',
    latitude: 39.8916,
    longitude: 32.8608,
    status: 'Açık',
    priority: 'Yüksek',
    date: '13 Tem 2026, 12:51',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  }
];

// Öncelik sırası: fullAddress → address + district + city → district + city
const getDisplayAddress = (report: {
  fullAddress?: string;
  address?: string;
  district?: string;
  city?: string;
}) => {
  if (report.fullAddress) return report.fullAddress;
  const parts = [report.address, report.district, report.city].filter(Boolean);
  return parts.join(', ') || '—';
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Açık': return styles.badgeRed;
    case 'İnceleniyor': return styles.badgeOrange;
    case 'Çözüldü': return styles.badgeGreen;
    default: return styles.badgeGray;
  }
};

const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case 'Kritik': return styles.badgeRed;
    case 'Yüksek': return styles.badgeOrange;
    case 'Normal': return styles.badgeBlue;
    default: return styles.badgeGray;
  }
};

export function MyReports() {
  const lastThreeMonthsCount = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return sampleReports.filter(report => {
      const createdDate = new Date(report.createdAt || report.date);
      return !isNaN(createdDate.getTime()) && createdDate >= threeMonthsAgo;
    }).length;
  }, []);

  return (
    <div className={styles.mainContent}>
      {/* Stat Cards */}
      <div className={styles.statsGrid} style={{ marginBottom: '24px' }}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
            <IconFileText size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{sampleReports.length}</div>
            <div className={styles.statLabel}>Toplam İhbar</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconDanger}`}>
            <IconAlertCircle size={24} />
          </div>
          <div>
            <div className={styles.statValue}>1</div>
            <div className={styles.statLabel}>Açık</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
            <IconClock size={24} />
          </div>
          <div>
            <div className={styles.statValue}>1</div>
            <div className={styles.statLabel}>İnceleniyor</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
            <IconCheckCircle size={24} />
          </div>
          <div>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Çözüldü</div>
          </div>
        </div>
      </div>

      <div className={styles.contentCard} style={{ maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ flex: '1 1 200px', maxWidth: '100%' }}>
            <h3 className={styles.cardTitle}>Son İhbarlarım</h3>
            <p className={styles.cardSubtitle} style={{ marginBottom: '16px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
              Oluşturduğunuz ihbarların güncel durumlarını buradan takip edebilirsiniz.
            </p>
          </div>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'flex-start', 
            gap: '6px', 
            background: '#eff6ff', 
            color: '#3b82f6', 
            padding: '6px 12px', 
            borderRadius: '20px', 
            fontSize: '13px', 
            fontWeight: 500,
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <IconClock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>Son 3 ayda {lastThreeMonthsCount} ihbar oluşturdunuz.</span>
          </div>
        </div>

        <div className={styles.desktopReportsTable}>
          <div className={styles.tableContainer}>
            <table className={styles.reportsTable}>
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sorun Türü</th>
                  <th>Açık Adres</th>
                  <th>Durum</th>
                  <th>Öncelik</th>
                  <th>Oluşturma Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {sampleReports.map((report) => (
                  <tr key={report.id}>
                    <td className={styles.tableBold}>{report.title}</td>
                    <td>{report.type}</td>
                    <td className={styles.tableAddress}>{getDisplayAddress(report)}</td>
                    <td>
                      <span className={`${styles.badge} ${getStatusBadgeClass(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getPriorityBadgeClass(report.priority)}`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className={styles.tableDate}>{report.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.mobileReportsList}>
          {sampleReports.map((report) => (
            <div key={report.id} className={styles.mobileReportCard}>
              <div className={styles.mobileReportTitle}>{report.title}</div>
              
              <div className={styles.mobileReportRow}>
                <span className={styles.mobileReportLabel}>Sorun Türü:</span>
                <span className={styles.mobileReportValue}>{report.type}</span>
              </div>
              
              <div className={styles.mobileReportRow}>
                <span className={styles.mobileReportLabel}>Adres:</span>
                <span className={styles.mobileReportValue}>{getDisplayAddress(report)}</span>
              </div>
              
              <div className={styles.mobileReportBadges}>
                <span className={`${styles.badge} ${getStatusBadgeClass(report.status)}`}>
                  {report.status}
                </span>
                <span className={`${styles.badge} ${getPriorityBadgeClass(report.priority)}`}>
                  {report.priority}
                </span>
              </div>
              
              <div className={styles.mobileReportDate}>Tarih: {report.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
