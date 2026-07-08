'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import styles from './page.module.css';

const STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
  OPEN: { label: 'Açık', badgeClass: styles.badgeOpen },
  IN_REVIEW: { label: 'İnceleniyor', badgeClass: styles.badgeInReview },
  RESOLVED: { label: 'Çözüldü', badgeClass: styles.badgeResolved },
  REJECTED: { label: 'Reddedildi', badgeClass: styles.badgeRejected },
};

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SANITATION: 'Su ve Kanalizasyon',
  TRANSPORTATION: 'Yol / Ulaşım',
  ENVIRONMENT: 'Çevre ve Temizlik',
  INFRASTRUCTURE: 'Altyapı',
  SECURITY: 'Güvenlik',
  LIGHTING: 'Aydınlatma',
  PARKS: 'Park ve Yeşil Alan',
};

export default function MyIssuesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['my-issues'],
    queryFn: async () => {
      const res: any = await api.get('/issues/my/list');
      return res.data || [];
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Bildirimlerim</h1>
            <p className={styles.subtitle}>
              Platform üzerinden bildirdiğiniz sorunları ve belediye/kurum yanıtlarını takip edin.
            </p>
          </div>
          <Link href="/" className="btn btn-primary">
            + Yeni Bildirim Oluştur
          </Link>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Bildirimleriniz yükleniyor...</div>
        ) : issues.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📍</div>
            <h3>Henüz bir bildirimde bulunmadınız</h3>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Yaşadığınız çevredeki sorunları harita üzerinden bildirerek çözüm sürecine katkıda bulunun.
            </p>
            <Link href="/" className="btn btn-primary">
              İlk Sorunu Bildir
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {issues.map((issue: any) => {
              const statusInfo = STATUS_MAP[issue.status] || {
                label: issue.status,
                badgeClass: styles.badgeOpen,
              };

              return (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className={styles.card}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div>
                    <div className={styles.cardHeader}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-primary, #2563eb)',
                        }}
                      >
                        {CATEGORY_LABELS[issue.category] || issue.category}
                      </span>
                      <span className={`${styles.badge} ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <h2 className={styles.cardTitle}>{issue.title}</h2>
                    <p className={styles.cardDesc}>{issue.description}</p>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>
                      📍 {issue.city} / {issue.district}
                    </span>
                    <span>
                      {format(new Date(issue.createdAt || issue.created_at), 'dd MMM yyyy', {
                        locale: tr,
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
