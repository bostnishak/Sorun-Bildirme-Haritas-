'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { api, profileApi } from '@/lib/api';
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
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const user = useAppStore(state => state.user);
  const _hasHydrated = useAppStore(state => state._hasHydrated);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => profileApi.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-issues'] });
    },
    onError: () => {
      alert('Bildirim silinemedi.');
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (confirm('Bu bildirimi kalıcı olarak silmek istediğinize emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  const { data: issues = [], isLoading: isQueryLoading } = useQuery({
    queryKey: ['my-issues'],
    queryFn: async () => {
      const res: any = await api.get('/issues/my/list');
      return res.data || [];
    },
    enabled: isAuthenticated && _hasHydrated,
  });

  if (!_hasHydrated) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b' }}>Yükleniyor...</div>
    </div>;
  }

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

        {isQueryLoading ? (
          <div className={styles.loading}>Bildirimleriniz yükleniyor...</div>
        ) : issues.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◆</div>
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
                <div
                  key={issue.id}
                  className={styles.card}
                  style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`${styles.badge} ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                        <button 
                          onClick={(e) => handleDelete(e, issue.id)}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                            fontSize: '18px', padding: '0 4px', lineHeight: 1
                          }}
                          title="Bildirimi Sil"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <Link href={`/issues/${issue.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h2 className={styles.cardTitle}>{issue.title}</h2>
                      <p className={styles.cardDesc}>{issue.description}</p>
                    </Link>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>
                      ◆ {issue.city} / {issue.district}
                    </span>
                    <span>
                      {format(new Date(issue.createdAt || issue.created_at), 'dd MMM yyyy', {
                        locale: tr,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
