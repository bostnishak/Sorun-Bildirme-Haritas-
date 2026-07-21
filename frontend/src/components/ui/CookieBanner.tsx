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
        <div className={styles.iconBox} style={{ color: '#2563eb' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
            <path d="M8.5 8.5v.01"/>
            <path d="M16 15.5v.01"/>
            <path d="M12 12v.01"/>
            <path d="M11 17v.01"/>
            <path d="M7 14v.01"/>
          </svg>
        </div>
        <div className={styles.textWrap}>
          <h4 className={styles.title}>Gizlilik ve Çerez Kullanımı</h4>
          <p className={styles.desc}>
            Sitemizin doğru çalışması, güvenliğinizin sağlanması ve anonim analizler için zorunlu ve performans çerezleri kullanmaktayız. Detaylı bilgi için <a href="/cerez-politikasi" className={styles.link}>Çerez Politikası</a> ve <a href="/kvkk" className={styles.link}>KVKK Aydınlatma Metni</a>&apos;ni inceleyebilirsiniz.
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
