'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { AccountInfoForm } from '@/components/profile/AccountInfoForm';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { SecuritySettingsForm } from '@/components/profile/SecuritySettingsForm';
import { MyReports } from '@/components/profile/MyReports';
import styles from './Profile.module.css';

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const logout = useAppStore(state => state.logout);
  const _hasHydrated = useAppStore(state => state._hasHydrated);
  const user = useAppStore(state => state.user);
  
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'photo' ? 'info' : (tabParam || 'info');
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam === 'photo' ? 'info' : tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!_hasHydrated) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748b' }}>Yükleniyor...</div>
    </div>;
  }

  if (!isAuthenticated) {
    return null; // Don't render until redirected
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return <AccountInfoForm />;
      case 'password':
        return <ChangePasswordForm />;
      case 'security':
        return <SecuritySettingsForm />;
      case 'reports':
        return <MyReports />;
      default:
        return <AccountInfoForm />;
    }
  };

  return (
    <>
      <Header />
      <main className={styles.profilePage}>
        <div className={styles.profileContainer}>
          
          <div className={styles.pageHeader}>
            <div className={styles.pageTitleRow}>
              <h1 className={styles.pageTitle}>Profilim</h1>
              <div 
                className={styles.statusBadge} 
                style={user?.isVerified ? {} : { background: '#ffedd5', color: '#ea580c' }}
              >
                <div 
                  className={styles.statusDot} 
                  style={user?.isVerified ? {} : { background: '#ea580c' }}
                ></div>
                {user?.isVerified ? 'Doğrulanmış Hesap' : 'Doğrulanmamış Hesap'}
              </div>
            </div>
            <p className={styles.pageSubtitle}>
              Hesap bilgilerini, bildirimlerini ve güvenlik ayarlarını buradan yönetebilirsin.
            </p>
          </div>

          <ProfileSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onLogout={handleLogout}
          />
          
          <div className={styles.mainContent}>
            {renderContent()}
          </div>
          
        </div>
      </main>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }}></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
