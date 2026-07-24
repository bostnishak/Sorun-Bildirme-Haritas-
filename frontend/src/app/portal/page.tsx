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
import AdminIssuesList from '@/components/portal/AdminIssuesList';

export default function PortalPage() {
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const [activeTab, setActiveTab] = useState<'APPROVAL_HUB' | 'OFFICER_DASHBOARD' | 'PERSONNEL' | 'ISSUES_LIST'>('ISSUES_LIST');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'INSTITUTION_OFFICER' && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
    if (user?.role === 'SUPER_ADMIN') {
      setActiveTab('ISSUES_LIST');
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
      <div className={`${styles.portalHeader} glass`} style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className={styles.portalLogo}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-primary)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-3" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
            </svg>
          </span>
          <div>
            <h1 className={styles.portalTitle}>Kurum Yönetim ve Çözüm Portalı</h1>
            <p className={styles.portalSubtitle}>
              {user?.institution?.name || (user?.role === 'SUPER_ADMIN' ? 'Admin Karar ve Denetim Paneli' : 'Kurum Saha Operasyon Masası')} • {user?.institution?.city || user?.city || 'Tüm Bölgeler'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user?.role === 'SUPER_ADMIN' && (
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700, fontSize: '12px', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Admin
            </span>
          )}
          <a href="/" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Ana Sayfaya Dön
          </a>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className={styles.statsGrid}>
        {[
          { label: 'TOPLAM İHBAR', value: stats?.total ?? 0, color: 'var(--color-primary)', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'ACİL / AÇIK', value: stats?.open_count ?? 0, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { label: 'İNCELEMEDE', value: stats?.in_review_count ?? 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'RESMİ ONAYLI', value: stats?.resolved_count ?? 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
          { label: 'BU AY GELEN', value: stats?.this_month ?? 0, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        ].map(stat => (
          <div key={stat.label} className={`${styles.statCard} card`} style={{ border: `1px solid ${stat.border}`, background: 'var(--color-surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div className={styles.statValue} style={{ color: stat.color }}>{stat.value.toLocaleString('tr')}</div>
            <div className={styles.statLabel} style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Admin Navigation Tabs */}
      {user?.role === 'SUPER_ADMIN' && (
        <div style={{ padding: '0 24px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            background: 'var(--color-surface)',
            padding: '8px',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            overflowX: 'auto'
          }}>
            <button
              onClick={() => setActiveTab('ISSUES_LIST')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: activeTab === 'ISSUES_LIST' ? '1px solid #bfdbfe' : '1px solid transparent',
                cursor: 'pointer',
                background: activeTab === 'ISSUES_LIST' ? '#eff6ff' : 'transparent',
                color: activeTab === 'ISSUES_LIST' ? '#1d4ed8' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              Vatandaş İhbarları
            </button>

            <button
              onClick={() => setActiveTab('APPROVAL_HUB')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: activeTab === 'APPROVAL_HUB' ? '1px solid #bfdbfe' : '1px solid transparent',
                cursor: 'pointer',
                background: activeTab === 'APPROVAL_HUB' ? '#eff6ff' : 'transparent',
                color: activeTab === 'APPROVAL_HUB' ? '#1d4ed8' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              Çözüm ve Red Onay Merkezi
            </button>

            <button
              onClick={() => setActiveTab('OFFICER_DASHBOARD')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: activeTab === 'OFFICER_DASHBOARD' ? '1px solid #bfdbfe' : '1px solid transparent',
                cursor: 'pointer',
                background: activeTab === 'OFFICER_DASHBOARD' ? '#eff6ff' : 'transparent',
                color: activeTab === 'OFFICER_DASHBOARD' ? '#1d4ed8' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Saha Operasyon Masası
            </button>

            <button
              onClick={() => setActiveTab('PERSONNEL')}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                border: activeTab === 'PERSONNEL' ? '1px solid #bfdbfe' : '1px solid transparent',
                cursor: 'pointer',
                background: activeTab === 'PERSONNEL' ? '#eff6ff' : 'transparent',
                color: activeTab === 'PERSONNEL' ? '#1d4ed8' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Personel ve Kurum Atama
            </button>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <div style={{ padding: '0 24px 40px 24px' }}>
        {user?.role === 'SUPER_ADMIN' ? (
          <>
            {activeTab === 'ISSUES_LIST' && <AdminIssuesList />}
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
