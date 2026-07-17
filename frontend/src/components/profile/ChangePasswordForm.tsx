import React, { useState } from 'react';
import { IconCheckCircle, IconEye, IconEyeOff } from '@/components/ui/Icon';
import styles from '@/app/profile/Profile.module.css';
import { api } from '@/lib/api';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const rules = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  const isPasswordValid = rules.length && rules.upper && rules.lower && rules.special;
  const isMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Yeni şifre belirlenen kuralları karşılamıyor.');
      return;
    }

    if (!isMatch) {
      setErrorMsg('Yeni şifreler eşleşmiyor.');
      return;
    }

    setIsLoading(true);
    try {
      await api.patch('/auth/me/password', {
        currentPassword,
        newPassword
      });
      setSuccessMsg('Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'Şifre güncellenirken bir hata oluştu.';
      if (msg.includes('Invalid credentials') || msg.toLowerCase().includes('mevcut şifre') || err?.response?.status === 401) {
        setErrorMsg('Mevcut şifreniz hatalı.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const EmptyCircleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
  );

  return (
    <div className={styles.mainContent}>
      <div className={styles.contentCard}>
        <h3 className={styles.cardTitle}>Şifre Değiştir</h3>
        
        {errorMsg && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #fecaca' }}>
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div style={{ padding: '12px', background: '#f0fdf4', color: '#22c55e', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #bbf7d0' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.formGroupFull}>
            <div className={styles.passwordRulesBox}>
              <h4 className={styles.passwordRulesTitle}>Şifre Kuralları</h4>
              <ul className={styles.passwordRulesList} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                <li style={{ color: rules.length ? '#16a34a' : '#94a3b8' }}>
                  {rules.length ? <IconCheckCircle size={14} /> : <EmptyCircleIcon />} En az 8 karakter
                </li>
                <li style={{ color: rules.upper ? '#16a34a' : '#94a3b8' }}>
                  {rules.upper ? <IconCheckCircle size={14} /> : <EmptyCircleIcon />} 1 büyük harf
                </li>
                <li style={{ color: rules.lower ? '#16a34a' : '#94a3b8' }}>
                  {rules.lower ? <IconCheckCircle size={14} /> : <EmptyCircleIcon />} 1 küçük harf
                </li>
                <li style={{ color: rules.special ? '#16a34a' : '#94a3b8' }}>
                  {rules.special ? <IconCheckCircle size={14} /> : <EmptyCircleIcon />} 1 özel karakter
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Mevcut Şifre</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className={styles.formInput}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                {showCurrent ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Yeni Şifre</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                className={styles.formInput}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                {showNew ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Yeni Şifre Tekrar</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                className={styles.formInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px', borderColor: (confirmPassword && !isMatch) ? '#ef4444' : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
            {confirmPassword && !isMatch && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>Yeni şifreler eşleşmiyor.</div>
            )}
          </div>

          <div className={`${styles.formGroupFull} ${styles.formActions}`}>
            <button 
              type="submit" 
              className={styles.btnPrimary} 
              disabled={isLoading || !isPasswordValid || (confirmPassword.length > 0 && !isMatch)}
              style={{ opacity: (isLoading || !isPasswordValid || (confirmPassword.length > 0 && !isMatch)) ? 0.7 : 1 }}
            >
              {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
