import React, { useState } from 'react';
import { IconCheckCircle } from '@/components/ui/Icon';
import styles from '@/app/profile/Profile.module.css';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Yeni şifreler eşleşmiyor!");
      return;
    }
    console.log('Password change requested');
    // TODO: implement API call here
  };

  return (
    <div className={styles.mainContent}>
      <div className={styles.dashboardLayout}>
        {/* Left Column: Form */}
        <div className={styles.dashboardMain}>
          <div className={styles.contentCard}>
            <h3 className={styles.cardTitle}>Şifre Değiştir</h3>
            <p className={styles.cardSubtitle}>
              Güvenliğiniz için şifreniz en az 8 karakter olmalı.
            </p>

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroupFull}>
                <label className={styles.formLabel}>Mevcut Şifre</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Yeni Şifre</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className={`${styles.formGroupFull} ${styles.formActions}`}>
                <button type="submit" className={styles.btnPrimary}>
                  Şifreyi Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Tips */}
        <div className={styles.dashboardSidebar}>
          <div className={styles.contentCard} style={{ padding: '24px', background: '#f8fafc' }}>
            <h3 className={styles.cardTitle}>Güçlü Şifre Önerileri</h3>
            <p className={styles.cardSubtitle} style={{ marginBottom: '16px' }}>Hesabınızı korumak için:</p>
            
            <div className={styles.securityList}>
              <div className={styles.securityItem}>
                <IconCheckCircle size={16} className={styles.securityIcon} />
                <span>En az <strong>8 karakter</strong> uzunluğunda bir şifre belirleyin.</span>
              </div>
              <div className={styles.securityItem}>
                <IconCheckCircle size={16} className={styles.securityIcon} />
                <span>Büyük harf, küçük harf ve rakamları bir arada kullanın.</span>
              </div>
              <div className={styles.securityItem}>
                <IconCheckCircle size={16} className={styles.securityIcon} />
                <span>Adınız, doğum tarihiniz gibi kolay tahmin edilebilir kişisel bilgileri kullanmaktan kaçının.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
