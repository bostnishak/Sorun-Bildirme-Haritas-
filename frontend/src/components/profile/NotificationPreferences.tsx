import React, { useState } from 'react';
import { IconClock, IconCheckCircle, IconBell, IconMail } from '@/components/ui/Icon';
import styles from '@/app/profile/Profile.module.css';

export function NotificationPreferences() {
  const [notifyOnReview, setNotifyOnReview] = useState(true);
  const [notifyOnResolve, setNotifyOnResolve] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Notification preferences saved', {
      notifyOnReview,
      notifyOnResolve,
      notifyAnnouncements,
      emailNotifications
    });
    // TODO: implement API call here
  };

  return (
    <div className={styles.mainContent}>
      <div className={styles.contentCard}>
        <h3 className={styles.cardTitle}>Bildirim Ayarları</h3>
        <p className={styles.cardSubtitle}>
          Sorun bildirimlerinle ilgili hangi durumlarda haberdar olmak istediğini seç.
        </p>

        <form onSubmit={handleSubmit} className={styles.preferencesForm}>
          
          <label className={styles.toggleRow}>
            <div className={styles.toggleContent}>
              <div className={styles.toggleIconWrapper}>
                <IconClock size={20} />
              </div>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Sorunum incelenmeye alındığında bildir</span>
                <span className={styles.toggleDesc}>Yetkililer bildirimini değerlendirmeye aldığında anında haber verilir.</span>
              </div>
            </div>
            <div className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={notifyOnReview}
                onChange={(e) => setNotifyOnReview(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </div>
          </label>

          <label className={styles.toggleRow}>
            <div className={styles.toggleContent}>
              <div className={styles.toggleIconWrapper}>
                <IconCheckCircle size={20} />
              </div>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Sorunum çözüldüğünde bildir</span>
                <span className={styles.toggleDesc}>Sorununuz başarıyla çözüldüğünde bildirim alırsınız.</span>
              </div>
            </div>
            <div className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={notifyOnResolve}
                onChange={(e) => setNotifyOnResolve(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </div>
          </label>

          <label className={styles.toggleRow}>
            <div className={styles.toggleContent}>
              <div className={styles.toggleIconWrapper}>
                <IconBell size={20} />
              </div>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Yeni duyurulardan haberdar et</span>
                <span className={styles.toggleDesc}>Platformla ilgili önemli güncellemeler ve duyurulardan haberdar olun.</span>
              </div>
            </div>
            <div className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={notifyAnnouncements}
                onChange={(e) => setNotifyAnnouncements(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </div>
          </label>

          <label className={styles.toggleRow}>
            <div className={styles.toggleContent}>
              <div className={styles.toggleIconWrapper}>
                <IconMail size={20} />
              </div>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>E-posta bildirimi gönder</span>
                <span className={styles.toggleDesc}>Tüm önemli bildirimler kayıtlı e-posta adresinize gönderilir.</span>
              </div>
            </div>
            <div className={styles.toggleSwitch}>
              <input 
                type="checkbox" 
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <span className={styles.toggleSlider}></span>
            </div>
          </label>

          <div className={styles.formActions} style={{ marginTop: '24px' }}>
            <button type="submit" className={styles.btnPrimary}>
              Tercihleri Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
