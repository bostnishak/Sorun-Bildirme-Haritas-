import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from '@/app/profile/Profile.module.css';

export function AccountInfoForm() {
  const { user } = useAppStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCity((user as any).city || '');
      setDistrict((user as any).district || '');
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Account info updated:', { firstName, lastName, phone, city, district });
    // TODO: implement API call here
  };

  return (
    <div className={styles.mainContent}>
      <div className={styles.contentCard}>
        <h3 className={styles.cardTitle}>Hesap Bilgileri</h3>
        <p className={styles.cardSubtitle}>
          Kişisel bilgilerinizi buradan görüntüleyebilir ve güncelleyebilirsiniz.
        </p>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ad</label>
                <input
                  className={styles.formInput}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Soyad</label>
                <input
                  className={styles.formInput}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>E-posta Adresi</label>
                <input
                  className={styles.formInput}
                  value={email}
                  disabled
                  title="E-posta adresi değiştirilemez"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Telefon Numarası</label>
                <input
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Şehir</label>
                <input
                  className={styles.formInput}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Şehir"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>İlçe</label>
                <input
                  className={styles.formInput}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="İlçe"
                />
              </div>

              <div className={`${styles.formGroupFull} ${styles.formActions}`}>
                <button type="submit" className={styles.btnPrimary}>
                  Kaydet
                </button>
              </div>
            </form>
      </div>
    </div>
  );
}
