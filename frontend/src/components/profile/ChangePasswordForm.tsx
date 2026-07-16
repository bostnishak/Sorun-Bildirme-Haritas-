import React, { useState } from 'react';
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
  );
}
