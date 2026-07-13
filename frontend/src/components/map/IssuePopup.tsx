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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  OPEN:      { label: 'Açık',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
  IN_REVIEW: { label: 'İnceleniyor',color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '🟡' },
  RESOLVED:  { label: 'Çözüldü',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '🟢' },
  REJECTED:  { label: 'Reddedildi',color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '⚫' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Kritik',  color: '#dc2626' },
  HIGH:     { label: 'Yüksek', color: '#ea580c' },
  MEDIUM:   { label: 'Orta',   color: '#d97706' },
  LOW:      { label: 'Düşük',  color: '#65a30d' },
};

const CATEGORY_COLORS: Record<string, string> = {
  WATER_SANITATION: '#3b82f6',
  TRANSPORTATION:   '#8b5cf6',
  ENVIRONMENT:      '#10b981',
  INFRASTRUCTURE:   '#f59e0b',
  SECURITY:         '#ef4444',
  LIGHTING:         '#f97316',
  PARKS:            '#84cc16',
};

export function IssuePopup({ issue, onClose }: IssuePopupProps) {
  const IconComponent = CATEGORY_ICON_MAP[issue.category];
  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
  const priorityCfg = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.MEDIUM;
  const catColor = CATEGORY_COLORS[issue.category] || '#6366f1';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>

        {/* ── Kapat Butonu ── */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* ── Renk Şeridi ── */}
        <div className={styles.colorStrip} style={{ background: `linear-gradient(135deg, ${catColor}, ${catColor}88)` }} />

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.categoryIcon} style={{ background: `${catColor}18`, border: `1.5px solid ${catColor}40`, color: catColor }}>
            {IconComponent ? (
              <IconComponent size={22} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            )}
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.idBadge}>#{issue.id}</div>
            <h3 className={styles.title}>{issue.title}</h3>
          </div>
        </div>

        {/* ── Adres Bandı ── */}
        <div className={styles.addressBand}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{(issue as any).address || `${issue.district}, ${issue.city}`}</span>
        </div>

        {/* ── Durum + Öncelik Rozetleri ── */}
        <div className={styles.badges}>
          <span className={styles.statusBadge} style={{ color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
            <span className={styles.statusDot} style={{ background: statusCfg.color }} />
            {statusCfg.label}
          </span>
          <span className={styles.priorityBadge} style={{ color: priorityCfg.color, background: `${priorityCfg.color}14`, border: `1px solid ${priorityCfg.color}30` }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {priorityCfg.label}
          </span>
          <span className={styles.catBadge} style={{ color: catColor, background: `${catColor}14`, border: `1px solid ${catColor}30` }}>
            {CATEGORY_LABELS[issue.category] || issue.category}
          </span>
        </div>

        {/* ── Fotoğraf ── */}
        {issue.imageUrl && (
          <div className={styles.imageWrapper}>
            <img src={issue.imageUrl} alt={issue.title} className={styles.image} />
          </div>
        )}

        {/* ── Açıklama ── */}
        {issue.description && (
          <div className={styles.description}>
            <p>{issue.description}</p>
          </div>
        )}

        {/* ── Meta Bilgiler ── */}
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                İhbar Tarihi
              </span>
              <span className={styles.metaValue}>
                {format(new Date(issue.createdAt), 'dd MMM yyyy', { locale: tr })}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                İhbar Saati
              </span>
              <span className={styles.metaValue}>
                {format(new Date(issue.createdAt), 'HH:mm', { locale: tr })}
              </span>
            </div>
          </div>
          {(issue as any).upvotes != null && (
            <div className={styles.upvoteRow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
              </svg>
              <span>{(issue as any).upvotes || (issue as any).upvoteCount || 0} kişi destekledi</span>
            </div>
          )}

          {/* ── 5651 Uyar-Kaldır Şikayet Bildirimi ── */}
          <div style={{ padding: '10px 16px 14px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' }}>
            <a
              href={`/iletisim?url=${encodeURIComponent('/issues/' + issue.id)}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span>🚨</span>
              <span>Bu İçeriği Şikâyet Et (5651 Uyar-Kaldır)</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
