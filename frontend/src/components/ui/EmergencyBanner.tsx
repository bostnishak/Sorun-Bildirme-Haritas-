'use client';

import { useState, useEffect } from 'react';
import styles from './EmergencyBanner.module.css';

export function EmergencyBanner() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const isClosed = sessionStorage.getItem('emergency_banner_closed');
    if (isClosed === 'true') {
      setClosed(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('emergency_banner_closed', 'true');
    setClosed(true);
  };

  if (closed) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className={styles.text}>
          <strong>Önemli Yasal Uyarı:</strong> Bu platform kentsel altyapı ve çevre sorunlarının bildirimine yöneliktir, acil müdahale hattı <u>değildir</u>. Acil durumlarda lütfen <strong>112 Acil Çağrı Merkezi</strong>&apos;ni arayınız.
        </p>
      </div>
      <button onClick={handleClose} className={styles.closeBtn} title="Kapat" aria-label="Uyarını Kapat">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
