import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | Türkiye Sorun Bildirim Haritası',
  description: 'Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
};

const LockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function KVKKPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Ana Sayfa
          </Link>
          <span className={styles.pageTitle}>KVKK Aydınlatma Metni</span>
        </div>
        <span className={styles.lastUpdated}>Son Güncelleme: Ocak 2024</span>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroIcon}><LockIcon /></div>
        <h1 className={styles.heroTitle}>KVKK Aydınlatma Metni</h1>
        <p className={styles.heroDesc}>
          6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel verilerinizin işlenmesine ilişkin bilgilendirme.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></span>
            Veri Sorumlusu
          </h2>
          <p className={styles.text}>Bu metin, <strong>T.C. İçişleri Bakanlığı</strong> tarafından veri sorumlusu sıfatıyla hazırlanmıştır.</p>
          <div className={styles.contactBox}>
            <div className={styles.contactRow}><svg className={styles.contactRowIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg><span><strong>Kurum:</strong> T.C. İçişleri Bakanlığı Bilgi İşlem Dairesi</span></div>
            <div className={styles.contactRow}><svg className={styles.contactRowIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>kvkk@icisleri.gov.tr</span></div>
            <div className={styles.contactRow}><svg className={styles.contactRowIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>Bakanlıklar, 06644, Ankara</span></div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
            İşlenen Kişisel Veriler
          </h2>
          <ul className={styles.list}>
            <li><strong>Kimlik Verileri:</strong> Ad, soyad, T.C. Kimlik numarası (hash), doğum yılı</li>
            <li><strong>İletişim Verileri:</strong> E-posta adresi</li>
            <li><strong>Konum Verileri:</strong> Bildirim sırasında paylaşılan GPS koordinatları</li>
            <li><strong>İşlem Verileri:</strong> Yapılan bildirimler ve tarih/saat bilgileri</li>
            <li><strong>Log Verileri:</strong> IP adresi, tarayıcı bilgisi, oturum kayıtları</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>
            İşlenme Amaçları
          </h2>
          <ul className={styles.list}>
            <li>NVİ entegrasyonu ile kimlik doğrulama ve güvenli kullanıcı kaydı</li>
            <li>Sorun bildirimlerinin ilgili kamu kurumlarına iletilmesi</li>
            <li>Platform güvenliği ve kötüye kullanımın önlenmesi</li>
            <li>Anonim istatistiksel analiz ve raporlama</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
            Haklarınız (KVKK Madde 11)
          </h2>
          <ul className={styles.list}>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenme amacını ve aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik/yanlış verilerin düzeltilmesini isteme</li>
            <li>Verilerin silinmesini veya yok edilmesini isteme</li>
            <li>Otomatik sistemlerle aleyhte karar çıkmasına itiraz etme</li>
          </ul>
          <div className={styles.highlight}>
            Haklarınızı kullanmak için <strong>kvkk@icisleri.gov.tr</strong> adresine kimliğinizi doğrulayan belgelerle başvurabilirsiniz. 30 gün içinde yanıtlanır.
          </div>
        </div>
      </div>
    </div>
  );
}
