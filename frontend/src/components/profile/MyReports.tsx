import React from 'react';
import { IconFileText, IconAlertCircle, IconClock, IconCheckCircle } from '@/components/ui/Icon';
import styles from '@/app/profile/Profile.module.css';

const sampleReports = [
  {
    id: 1,
    title: 'Dikmen Caddesi Su Patlağı',
    type: 'Altyapı',
    address: 'Çankaya, Ankara',
    status: 'İnceleniyor',
    priority: 'Kritik',
    date: '13 Tem 2026, 12:51'
  },
  {
    id: 2,
    title: 'Turan Güneş Bulvarı Çukur',
    type: 'Yol / Ulaşım',
    address: 'Çankaya, Ankara',
    status: 'Açık',
    priority: 'Yüksek',
    date: '13 Tem 2026, 12:51'
  }
];

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
  return (
    <div className={styles.mainContent}>
      {/* Stat Cards */}
      <div className={styles.statsGrid} style={{ marginBottom: '24px' }}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
            <IconFileText size={24} />
          </div>
          <div>
            <div className={styles.statValue}>2</div>
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

      <div className={styles.contentCard}>
        <h3 className={styles.cardTitle}>Son İhbarlarım</h3>
        <p className={styles.cardSubtitle}>
          Oluşturduğunuz ihbarların güncel durumlarını buradan takip edebilirsiniz.
        </p>

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
                  <td className={styles.tableAddress}>{report.address}</td>
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
    </div>
  );
}
