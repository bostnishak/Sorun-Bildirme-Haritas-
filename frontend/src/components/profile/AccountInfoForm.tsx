import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TR_CITIES_DISTRICTS } from '@/lib/turkeyCities';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from '@/app/profile/Profile.module.css';

export function AccountInfoForm() {
  const user = useAppStore(state => state.user);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await api.patch('/auth/me', { phone, city, district }) as any;
      const updatedUser = response?.data?.user || response?.data || response?.user || response;
      useAppStore.getState().updateUser(updatedUser);
      toast.success('Profil bilgileriniz güncellendi.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.error?.message || err?.message || 'Profil güncellenirken bir hata oluştu.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.mainContent}>
      <div className={styles.contentCard}>
        <h3 className={styles.cardTitle}>Hesap Bilgileri</h3>
        <p className={styles.cardSubtitle}>
          Telefon, şehir ve ilçe bilgilerinizi buradan güncelleyebilirsiniz.
        </p>

        <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ad</label>
                <input
                  className={styles.formInput}
                  value={firstName}
                  disabled
                  title="Ad değiştirilemez"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Soyad</label>
                <input
                  className={styles.formInput}
                  value={lastName}
                  disabled
                  title="Soyad değiştirilemez"
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
                <select
                  className={styles.formInput}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setDistrict(''); // Şehir değişince ilçeyi sıfırla
                  }}
                >
                  <option value="">Şehir seçiniz</option>
                  {Object.keys(TR_CITIES_DISTRICTS).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>İlçe</label>
                <select
                  className={styles.formInput}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!city}
                >
                  <option value="">İlçe seçiniz</option>
                  {city && TR_CITIES_DISTRICTS[city]?.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className={`${styles.formGroupFull} ${styles.formActions}`}>
                <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
      </div>
    </div>
  );
}
