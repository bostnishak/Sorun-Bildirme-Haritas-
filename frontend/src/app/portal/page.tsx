'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import styles from './page.module.css';

export default function PortalPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  // Yetki kontrolü
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'INSTITUTION_OFFICER' && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-issues'],
    queryFn: async () => {
      const response: any = await api.get('/admin/portal/issues');
      return response;
    },
    enabled: isAuthenticated && (user?.role === 'INSTITUTION_OFFICER' || user?.role === 'SUPER_ADMIN'),
  });

  const { data: stats } = useQuery({
    queryKey: ['portal-stats'],
    queryFn: async () => {
      const response: any = await api.get('/admin/stats');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || (user?.role !== 'INSTITUTION_OFFICER' && user?.role !== 'SUPER_ADMIN')) {
    return null;
  }

  const issues = data?.data ?? [];

  const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Açık', IN_REVIEW: 'İnceleniyor', RESOLVED: 'Çözüldü', REJECTED: 'Reddedildi',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    WATER_SANITATION: 'Su ve Kanalizasyon', TRANSPORTATION: 'Yol / Ulaşım',
    ENVIRONMENT: 'Çevre ve Temizlik', INFRASTRUCTURE: 'Altyapı',
    SECURITY: 'Güvenlik', LIGHTING: 'Aydınlatma', PARKS: 'Park ve Yeşil Alan',
  };

  return (
    <div className={styles.portal}>
      {/* Portal Header */}
      <div className={`${styles.portalHeader} glass`}>
        <div className={styles.portalLogo}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-primary)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16"/><path d="M2 18h20"/><path d="M12 2v4"/><path d="M4 18v-8h16v8"/><path d="M8 18v-5"/><path d="M12 18v-5"/><path d="M16 18v-5"/><path d="M4 10L12 6l8 4"/></svg>
          </span>
          <div>
            <h1 className={styles.portalTitle}>Kurum Yönetim Portalı</h1>
            <p className={styles.portalSubtitle}>
              {user?.institution?.name || 'Yönetici'} — {user?.institution?.city}
            </p>
          </div>
        </div>
        <a href="/" className="btn btn-ghost btn-sm">← Ana Sayfaya Dön</a>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Toplam', value: stats?.total ?? 0, color: 'var(--color-primary)' },
          { label: 'Açık', value: stats?.open_count ?? 0, color: 'var(--color-open)' },
          { label: 'İnceleniyor', value: stats?.in_review_count ?? 0, color: 'var(--color-in-review)' },
          { label: 'Çözüldü', value: stats?.resolved_count ?? 0, color: 'var(--color-resolved)' },
          { label: 'Bu Ay', value: stats?.this_month ?? 0, color: 'var(--color-primary)' },
        ].map(stat => (
          <div key={stat.label} className={`${styles.statCard} card`}>
            <div className={styles.statValue} style={{ color: stat.color }}>{stat.value.toLocaleString('tr')}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Issues Table */}
      <div className={`${styles.tableCard} card`}>
        <h2 className={styles.tableTitle}>Sorun Listesi</h2>

        {isLoading ? (
          <div className={styles.loading}>Yükleniyor...</div>
        ) : error ? (
          <div className={styles.errMsg}>Veriler yüklenirken hata oluştu.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Kategori</th>
                  <th>Öncelik</th>
                  <th>Durum</th>
                  <th>Şehir / İlçe</th>
                  <th>Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue: any) => (
                  <tr key={issue.id}>
                    <td className={styles.titleCell}>{issue.title}</td>
                    <td>{CATEGORY_LABELS[issue.category] ?? issue.category}</td>
                    <td>
                      <span className={`badge badge-${issue.priority?.toLowerCase()}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${issue.status?.toLowerCase().replace('_', '-')}`}>
                        {STATUS_LABELS[issue.status] ?? issue.status}
                      </span>
                    </td>
                    <td>{issue.city} / {issue.district}</td>
                    <td>{format(new Date(issue.created_at || issue.createdAt), 'dd MMM, HH:mm', { locale: tr })}</td>
                    <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusUpdateMenu issueId={issue.id} currentStatus={issue.status} />
                      <Link
                        href={`/issues/${issue.id}`}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563eb',
                          textDecoration: 'none',
                          padding: '6px 10px',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          background: '#eff6ff',
                        }}
                      >
                        Açıklama Ekle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusUpdateMenu({ issueId, currentStatus }: { issueId: string; currentStatus: string }) {
  const queryClient = useQueryClient();

  const updateStatus = async (newStatus: string) => {
    try {
      await api.patch(`/issues/${issueId}/status`, { status: newStatus });
      toast.success('Sorun durumu güncellendi!');
      queryClient.invalidateQueries({ queryKey: ['portal-issues'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stats'] });
    } catch {
      toast.error('Durum güncellenemedi.');
    }
  };

  const options = [
    { value: 'OPEN', label: 'Açık (Acil)' },
    { value: 'IN_REVIEW', label: 'İnceleniyor' },
    { value: 'RESOLVED', label: 'Çözüldü' },
    { value: 'REJECTED', label: 'Reddedildi' },
  ].filter(o => o.value !== currentStatus);

  return (
    <select
      className="input"
      style={{ padding: '4px 8px', fontSize: '12px', width: '130px' }}
      defaultValue=""
      onChange={e => e.target.value && updateStatus(e.target.value)}
    >
      <option value="">Güncelle...</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
