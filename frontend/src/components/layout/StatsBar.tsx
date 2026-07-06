'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  IconMessageSquare, IconAlertCircle, IconClock,
  IconCheckCircle, IconTrendingUp,
} from '@/components/ui/Icon';
import styles from './StatsBar.module.css';

const MOCK_STATS = {
  total: 12458, open: 4231, inReview: 3276, resolved: 4951,
  thisMonth: 1248, thisMonthChange: 12.5,
};

export function StatsBar() {
  const [stats, setStats] = useState(MOCK_STATS);

  useEffect(() => {
    const fetch = async () => {
      try {
        const r: any = await api.get('/issues/stats');
        if (r) setStats({
          total: r.total ?? MOCK_STATS.total,
          open: r.open_count ?? r.open ?? MOCK_STATS.open,
          inReview: r.in_review_count ?? r.inReview ?? MOCK_STATS.inReview,
          resolved: r.resolved_count ?? r.resolved ?? MOCK_STATS.resolved,
          thisMonth: r.this_month ?? MOCK_STATS.thisMonth,
          thisMonthChange: r.this_month_change ?? MOCK_STATS.thisMonthChange,
        });
      } catch { /* use mock */ }
    };
    fetch();
  }, []);

  const total = stats.total;
  const openPct = total > 0 ? Math.round((stats.open / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((stats.inReview / total) * 100) : 0;
  const resolvedPct = total > 0 ? Math.round((stats.resolved / total) * 100) : 0;

  return (
    <div className={styles.statsBar}>
      <div id="stat-total" className={styles.statItem}>
        <div className={styles.statIconWrap} style={{ background: 'rgba(29,78,216,0.1)', color: 'var(--color-primary)' }}>
          <IconMessageSquare size={18} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue} style={{ color: 'var(--color-primary)' }}>
            {total.toLocaleString('tr')}
          </span>
          <span className={styles.statLabel}>Toplam Bildirim</span>
          <span className={styles.statSub}>Tüm zamanlar</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div id="stat-open" className={styles.statItem}>
        <div className={styles.statIconWrap} style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--color-open)' }}>
          <IconAlertCircle size={18} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue} style={{ color: 'var(--color-open)' }}>
            {stats.open.toLocaleString('tr')}
          </span>
          <span className={styles.statLabel}>Açık</span>
          <span className={styles.statSub}>%{openPct}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div id="stat-review" className={styles.statItem}>
        <div className={styles.statIconWrap} style={{ background: 'rgba(217,119,6,0.1)', color: 'var(--color-in-review)' }}>
          <IconClock size={18} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue} style={{ color: 'var(--color-in-review)' }}>
            {stats.inReview.toLocaleString('tr')}
          </span>
          <span className={styles.statLabel}>İnceleniyor</span>
          <span className={styles.statSub}>%{reviewPct}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div id="stat-resolved" className={styles.statItem}>
        <div className={styles.statIconWrap} style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--color-resolved)' }}>
          <IconCheckCircle size={18} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue} style={{ color: 'var(--color-resolved)' }}>
            {stats.resolved.toLocaleString('tr')}
          </span>
          <span className={styles.statLabel}>Çözüldü</span>
          <span className={styles.statSub}>%{resolvedPct}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div id="stat-this-month" className={styles.statItem}>
        <div className={styles.statIconWrap} style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--color-resolved)' }}>
          <IconTrendingUp size={18} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue} style={{ color: 'var(--color-resolved)' }}>
            {stats.thisMonth.toLocaleString('tr')}
          </span>
          <span className={styles.statLabel}>Bu Ayki Bildirim</span>
          <span className={styles.statSub} style={{ color: '#16a34a' }}>
            +%{stats.thisMonthChange}
          </span>
        </div>
      </div>
    </div>
  );
}
