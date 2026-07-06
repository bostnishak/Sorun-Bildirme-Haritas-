'use client';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Issue } from '@/store/useAppStore';
import { CATEGORY_ICON_MAP } from '@/components/ui/Icon';
import styles from './IssuePopup.module.css';

interface IssuePopupProps {
  issue: Issue;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SANITATION: 'Su ve Kanalizasyon',
  TRANSPORTATION: 'Yol / Ulaşım',
  ENVIRONMENT: 'Çevre ve Temizlik',
  INFRASTRUCTURE: 'Altyapı',
  SECURITY: 'Güvenlik',
  LIGHTING: 'Aydınlatma',
  PARKS: 'Park ve Yeşil Alan',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Açık',
  IN_REVIEW: 'İnceleniyor',
  RESOLVED: 'Çözüldü',
  REJECTED: 'Reddedildi',
};

export function IssuePopup({ issue, onClose }: IssuePopupProps) {
  const IconComponent = CATEGORY_ICON_MAP[issue.category];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.popup} glass-elevated animate-slide-up`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.categoryIcon}>
            {IconComponent ? (
              <IconComponent size={20} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            )}
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.title}>{issue.title}</h3>
            <p className={styles.location}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {issue.district}, {issue.city}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Image */}
        {issue.imageUrl && (
          <div className={styles.imageWrapper}>
            <img src={issue.imageUrl} alt={issue.title} className={styles.image} />
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.description}>{issue.description}</p>

          {/* Meta */}
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Kategori</span>
              <span className={styles.metaValue}>
                {CATEGORY_LABELS[issue.category] || issue.category}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Durum</span>
              <span className={`badge badge-${issue.status.toLowerCase().replace('_', '-')}`}>
                {STATUS_LABELS[issue.status] || issue.status}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Tarih</span>
              <span className={styles.metaValue}>
                {format(new Date(issue.createdAt), 'dd MMM yyyy, HH:mm', { locale: tr })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
