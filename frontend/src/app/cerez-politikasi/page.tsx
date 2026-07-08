'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { IconShield } from '@/components/ui/Icon';

export default function CerezPolitikasiPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      <main style={{ maxWidth: '860px', margin: '40px auto', padding: '32px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontWeight: 600, fontSize: '14px', marginBottom: '24px' }}>
          <span>←</span>
          Ana Sayfaya Dön
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', marginBottom: '16px' }}>
          <IconShield size={28} />
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>Çerez (Cookie) Politikası</h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6 }}>
          Türkiye Sorun Bildirim Haritası (ChaosMind) platformunu ziyaretiniz sırasında kullanıcı deneyiminizin iyileştirilmesi,
          oturumuzun güvenle sürdürülmesi ve anonim site kullanım istatistiklerinin toplanması amacıyla çerezler kullanılmaktadır.
        </p>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '28px', marginBottom: '8px' }}>1. Zorunlu (Oturum) Çerezleri</h2>
        <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
          Platform üzerinde güvenli giriş yapabilmeniz (JWT oturum yönetimi) ve siber saldırılara (CSRF/XSS) karşı korunmanız amacıyla
          kullanılan teknik çerezlerdir. Bu çerezler olmadan sistemin temel işlevleri çalışmaz.
        </p>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '24px', marginBottom: '8px' }}>2. Performans ve Analitik Çerezleri</h2>
        <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
          Hangi şehirlerden bildirim yapıldığını ve harita performansını ölçmek amacıyla anonimleştirilmiş istatistiki veriler toplanır.
          Kişisel kimlik bilgileriniz hiçbir reklam veya pazarlama amacıyla üçüncü şahıslarla paylaşılmaz.
        </p>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '24px', marginBottom: '8px' }}>3. Çerez Yönetimi</h2>
        <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
          Tarayıcınızın ayarlarından dilediğiniz zaman çerez tercihlerinizi değiştirebilir veya mevcut çerezleri silebilirsiniz.
        </p>
      </main>
    </div>
  );
}
