import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { IconUser, IconMail, IconClock, IconCheckCircle, IconLock, IconArrowRight } from '@/components/ui/Icon';
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

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'CITIZEN': return 'Vatandaş';
      case 'INSTITUTION_OFFICER': return 'Kurum Yetkilisi';
      case 'SUPER_ADMIN': return 'Sistem Yöneticisi';
      default: return role || 'Vatandaş';
    }
  };

  return (
    <div className={styles.mainContent}>
      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>📋</div>
          <div>
            <div className={styles.statValue}>2</div>
            <div className={styles.statLabel}>Toplam Bildirim</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconDanger}`}>🚨</div>
          <div>
            <div className={styles.statValue}>1</div>
            <div className={styles.statLabel}>Açık</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconWarning}`}>⏳</div>
          <div>
            <div className={styles.statValue}>1</div>
            <div className={styles.statLabel}>İnceleniyor</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>✅</div>
          <div>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Çözüldü</div>
          </div>
        </div>
      </div>

      <div className={styles.dashboardLayout}>
        {/* Left Column: Form */}
        <div className={styles.dashboardMain}>
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

        {/* Right Column: Summaries */}
        <div className={styles.dashboardSidebar}>
          <div className={styles.contentCard} style={{ padding: '24px' }}>
            <h3 className={styles.cardTitle}>Hesap Özeti</h3>
            <p className={styles.cardSubtitle} style={{ marginBottom: '16px' }}>Genel durumunuz.</p>
            
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><IconUser size={18} /></div>
                <div className={styles.infoText}>
                  <span className={styles.infoLabel}>Kullanıcı Türü</span>
                  <span className={styles.infoValue}>{getRoleLabel(user?.role)}</span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><IconMail size={18} /></div>
                <div className={styles.infoText}>
                  <span className={styles.infoLabel}>E-posta Durumu</span>
                  <span className={styles.infoValue} style={{ color: '#16a34a' }}>Doğrulanmış</span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><IconClock size={18} /></div>
                <div className={styles.infoText}>
                  <span className={styles.infoLabel}>Son Giriş</span>
                  <span className={styles.infoValue}>Bugün</span>
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><IconCheckCircle size={18} /></div>
                <div className={styles.infoText}>
                  <span className={styles.infoLabel}>Kayıt Durumu</span>
                  <span className={styles.infoValue}>Aktif</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.contentCard} style={{ padding: '24px', background: 'linear-gradient(145deg, #eff6ff 0%, #ffffff 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: '#3b82f6', color: 'white', borderRadius: '10px' }}>
                <IconLock size={16} />
              </div>
              <h3 className={styles.cardTitle} style={{ margin: 0 }}>Güvenlik</h3>
            </div>
            <p className={styles.cardSubtitle} style={{ marginBottom: '16px', color: '#475569' }}>
              Şifrenizi düzenli aralıklarla güncellemeniz önerilir.
            </p>
            <button 
              className={styles.btnSecondary} 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              onClick={() => {
                const navBtn = document.querySelector('button:nth-child(2)') as HTMLButtonElement;
                if (navBtn) navBtn.click();
              }}
            >
              Şifreyi Değiştir
              <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
