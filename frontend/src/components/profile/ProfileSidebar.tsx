import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  IconUser,
  IconLock,
  IconFileText,
  IconBell,
  IconCamera,
  IconEdit,
  IconTrash,
  IconLogOut
} from '@/components/ui/Icon';
import { ProfilePhotoForm } from './ProfilePhotoForm';
import styles from '@/app/profile/Profile.module.css';

interface ProfileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function ProfileSidebar({ activeTab, onTabChange, onLogout }: ProfileSidebarProps) {
  const { user } = useAppStore();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeletePhoto = () => {
    if (confirm('Profil fotoğrafınızı silmek istediğinize emin misiniz?')) {
      alert('Profil fotoğrafınız başarıyla silindi (Demo).');
      // In a real app, dispatch an action to clear the photo.
    }
    setPopoverOpen(false);
  };

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div 
            className={styles.avatarWrapper} 
            onClick={() => setPopoverOpen(!popoverOpen)}
            ref={popoverRef}
          >
            <div className={styles.avatarLarge}>
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
              )}
            </div>
            
            <div className={styles.avatarOverlay}>
              <IconCamera size={24} className={styles.avatarHoverCamera} />
            </div>

            {popoverOpen && (
              <div className={styles.avatarPopover} onClick={e => e.stopPropagation()}>
                <button 
                  className={styles.popoverItem} 
                  onClick={() => { setPhotoModalOpen(true); setPopoverOpen(false); }}
                >
                  <IconEdit size={16} />
                  Fotoğrafı Düzenle
                </button>
                <button 
                  className={`${styles.popoverItem} ${styles.popoverItemDanger}`} 
                  onClick={handleDeletePhoto}
                >
                  <IconTrash size={16} />
                  Fotoğrafı Sil
                </button>
              </div>
            )}
          </div>
          <h2 className={styles.sidebarName}>{user?.firstName} {user?.lastName}</h2>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Puan: {user?.points ?? 0}
            </span>
            <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Güven Skoru: {user?.trustScore ?? '–'}
            </span>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          <button
            className={`${styles.navItem} ${activeTab === 'info' ? styles.navItemActive : ''}`}
            onClick={() => onTabChange('info')}
          >
            <IconUser className={styles.navIcon} size={18} />
            Hesap Bilgileri
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'password' ? styles.navItemActive : ''}`}
            onClick={() => onTabChange('password')}
          >
            <IconLock className={styles.navIcon} size={18} />
            Şifre Değiştir
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'security' ? styles.navItemActive : ''}`}
            onClick={() => onTabChange('security')}
          >
            <IconLock className={styles.navIcon} size={18} />
            Güvenlik & 2FA
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'reports' ? styles.navItemActive : ''}`}
            onClick={() => onTabChange('reports')}
          >
            <IconFileText className={styles.navIcon} size={18} />
            İhbarlarım
          </button>

          <button
            className={`${styles.navItem} ${styles.dropdownItemLogout}`}
            style={{ marginTop: 'auto', borderTop: 'none', color: '#ef4444' }}
            onClick={onLogout}
          >
            <IconLogOut className={styles.navIcon} size={18} />
            Çıkış Yap
          </button>
        </nav>
      </aside>

      {photoModalOpen && (
        <ProfilePhotoForm onClose={() => setPhotoModalOpen(false)} />
      )}
    </>
  );
}
