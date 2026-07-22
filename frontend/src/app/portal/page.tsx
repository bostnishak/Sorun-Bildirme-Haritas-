'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import styles from './page.module.css';

import OfficerDashboard from '@/components/portal/OfficerDashboard';
import ApprovalHub from '@/components/portal/ApprovalHub';
import PersonnelManagement from '@/components/portal/PersonnelManagement';

export default function PortalPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const [activeTab, setActiveTab] = useState<'APPROVAL_HUB' | 'OFFICER_DASHBOARD' | 'PERSONNEL'>('OFFICER_DASHBOARD');

  // Yetki kontrolü
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'INSTITUTION_OFFICER' && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
    if (user?.role === 'SUPER_ADMIN') {
      setActiveTab('APPROVAL_HUB');
    } else {
      setActiveTab('OFFICER_DASHBOARD');
    }
  }, [isAuthenticated, user, router]);

  const { data: stats } = useQuery({
    queryKey: ['portal-stats'],
    queryFn: async () => {
      const response: any = await api.get('/admin/stats');
      return response.data;
    },
    enabled: isAuthenticated && (user?.role === 'INSTITUTION_OFFICER' || user?.role === 'SUPER_ADMIN'),
  });

  if (!isAuthenticated || (user?.role !== 'INSTITUTION_OFFICER' && user?.role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className={styles.portal}>
      {/* Portal Header */}
      <div className={`${styles.portalHeader} glass`}>
        <div className={styles.portalLogo}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-primary)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16"/><path d="M2 18h20"/><path d="M12 2v4"/><path d="M4 18v-8h16v8"/><path d="M8 18v-5"/><path d="M12 18v-5"/><path d="M16 18v-5"/><path d="M4 10L12 6l8 4"/></svg>
          </span>
          <div>
            <h1 className={styles.portalTitle}>Kurum Yönetim ve Çözüm Portalı</h1>
            <p className={styles.portalSubtitle}>
              {user?.institution?.name || (user?.role === 'SUPER_ADMIN' ? '👑 Süper Yönetici Karar ve Denetim Paneli' : '🏢 Kurum Saha Operasyon Masası')} — {user?.institution?.city || user?.city || 'Bölge Sınırları'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user?.role === 'SUPER_ADMIN' && (
            <span style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 800, fontSize: '12px', padding: '6px 12px', borderRadius: '20px' }}>
              👑 Süper Yönetici
            </span>
          )}
          <a href="/" className="btn btn-ghost btn-sm">← Ana Sayfaya Dön</a>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className={styles.statsGrid}>
        {[
          { label: 'Toplam İhbar', value: stats?.total ?? 0, color: 'var(--color-primary)' },
          { label: 'Acil Açık', value: stats?.open_count ?? 0, color: '#ef4444' },
          { label: 'İncelemede', value: stats?.in_review_count ?? 0, color: '#3b82f6' },
          { label: 'Resmi Onaylı', value: stats?.resolved_count ?? 0, color: '#10b981' },
          { label: 'Bu Ay Gelen', value: stats?.this_month ?? 0, color: 'var(--color-primary)' },
        ].map(stat => (
          <div key={stat.label} className={`${styles.statCard} card`}>
            <div className={styles.statValue} style={{ color: stat.color }}>{stat.value.toLocaleString('tr')}</div>
            <div className={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Admin / Officer Navigation Tabs */}
      {user?.role === 'SUPER_ADMIN' && (
        <div style={{ padding: '0 24px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            background: 'var(--color-surface)',
            padding: '8px',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            overflowX: 'auto'
          }}>
            <button
              onClick={() => setActiveTab('APPROVAL_HUB')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'APPROVAL_HUB' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                color: activeTab === 'APPROVAL_HUB' ? '#fff' : 'var(--color-text)',
                boxShadow: activeTab === 'APPROVAL_HUB' ? '0 4px 14px rgba(245, 158, 11, 0.35)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              🛡️ Çözüm & Red Onay Merkezi
            </button>

            <button
              onClick={() => setActiveTab('OFFICER_DASHBOARD')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'OFFICER_DASHBOARD' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                color: activeTab === 'OFFICER_DASHBOARD' ? '#fff' : 'var(--color-text)',
                boxShadow: activeTab === 'OFFICER_DASHBOARD' ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              🏢 Saha Operasyon Masası (Tüm İhbarlar)
            </button>

            <button
              onClick={() => setActiveTab('PERSONNEL')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'PERSONNEL' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'PERSONNEL' ? '#fff' : 'var(--color-text)',
                boxShadow: activeTab === 'PERSONNEL' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              👥 Personel & Kurum Atama
            </button>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <div style={{ padding: '0 24px 40px 24px' }}>
        {user?.role === 'SUPER_ADMIN' ? (
          <>
            {activeTab === 'APPROVAL_HUB' && <ApprovalHub />}
            {activeTab === 'OFFICER_DASHBOARD' && <OfficerDashboard user={user} />}
            {activeTab === 'PERSONNEL' && <PersonnelManagement />}
          </>
        ) : (
          <OfficerDashboard user={user} />
        )}
      </div>
    </div>
  );
}
