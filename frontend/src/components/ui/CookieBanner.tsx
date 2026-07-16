'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent_status');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent_status', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent_status', 'declined');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={styles.bannerContainer}>
      <div className={styles.banner}>
        <div className={styles.iconBox} style={{ fontWeight: 700, fontSize: '18px', color: '#2563eb' }}>
          [i]
        </div>
        <div className={styles.textWrap}>
          <h4 className={styles.title}>Gizlilik ve Çerez Kullanımı</h4>
          <p className={styles.desc}>
            Sitemizin doğru çalışması, güvenliğinizin sağlanması ve anonim analizler için zorunlu ve performans çerezleri kullanmaktayız. Detaylı bilgi için <Link href="/cerez-politikasi" className={styles.link}>Çerez Politikası</Link> ve <Link href="/kvkk" className={styles.link}>KVKK Aydınlatma Metni</Link>&apos;ni inceleyebilirsiniz.
          </p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleDecline} className={styles.declineBtn}>
            Sadece Zorunluları Kabul Et
          </button>
          <button onClick={handleAccept} className={styles.acceptBtn}>
            Tümünü Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
