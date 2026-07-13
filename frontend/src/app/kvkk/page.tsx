import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | Türkiye Sorun Bildirim Haritası',
  description: '6698 Sayılı Kişisel Verilerin Korunması Kanunu uyarınca aydınlatma metni.',
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
        <span className={styles.lastUpdated}>Son Güncelleme: 13 Temmuz 2026</span>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroIcon}><LockIcon /></div>
        <h1 className={styles.heroTitle}>KVKK Aydınlatma Metni</h1>
        <p className={styles.heroDesc}>
          6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel verilerinizin işlenmesi, yapay zeka denetimi ve veri güvenliğine ilişkin bilgilendirme.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>1</span>
            Veri Sorumlusu ve Platform Tanımı
          </h2>
          <p className={styles.text}>
            <strong>Türkiye Sorun Bildirim Haritası (Etiya Project)</strong> platformu, kamu yararı ve vatandaş-kurum etkileşimini kolaylaştırmak amacıyla geliştirilen bağımsız bir dijital platformdur. 6698 Sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca veri sorumlusu sıfatıyla kişisel verileriniz aşağıda açıklanan çerçevede işlenmektedir.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>2</span>
            İşlenen Kişisel Verileriniz
          </h2>
          <ul className={styles.list}>
            <li><strong>Kimlik Verileri:</strong> Ad, soyad, doğum yılı ve T.C. Kimlik Numarası (T.C. Kimlik numaranız açık metin olarak asla saklanmaz; SHA-256 kriptografik tuzlama/peppering yöntemiyle geri döndürülemez özet olarak veritabanında tutulur).</li>
            <li><strong>İletişim Verileri:</strong> E-posta adresi, cep telefonu numarası.</li>
            <li><strong>Konum Verileri:</strong> Sorun bildiriminde beyan ettiğiniz adres ve fotoğrafların EXIF metaverisinde yer alan coğrafi koordinatlar (enlem/boylam).</li>
            <li><strong>İşlem ve İçerik Verileri:</strong> Bildirilen sorun başlığı, açıklaması, yorumlar ve oy hareketleri.</li>
            <li><strong>Özel Nitelikli / Görsel Veriler:</strong> Yüklenen fotoğraflar (fotoğraflardaki yüz ve plaka gibi hassas veriler otomatik olarak bulanıklaştırma işleminden geçirilir).</li>
            <li><strong>İşlem Güvenliği ve Trafik Bilgileri:</strong> 5651 Sayılı Kanun gereğince IP adresi, tarayıcı bilgileri, zaman damgası ve oturum logları.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>3</span>
            Kişisel Verilerin İşlenme Amaçları ve Hukuki Sebebi
          </h2>
          <p className={styles.text}>Kişisel verileriniz KVKK Madde 5 ve 6 kapsamında aşağıdaki hukuki sebeplere dayalı olarak işlenmektedir:</p>
          <ul className={styles.list}>
            <li><strong>Açık Rıza (Md. 5/1 ve Md. 6/2):</strong> Yüklenen görsellerde yüz tanıma/plaka bulanıklaştırma yapılması ve içeriklerin moderasyon amacıyla yurt dışı kaynaklı yapay zeka servislerine aktarılması.</li>
            <li><strong>Sözleşmenin Kurulması ve İfası (Md. 5/2-c):</strong> Platform üyelik kaydının oluşturulması ve ihbar takip hizmetlerinin sunulması.</li>
            <li><strong>Hukuki Yükümlülüğün Yerine Getirilmesi (Md. 5/2-ç):</strong> 5651 Sayılı Kanun gereği trafik loglarının 2 yıl süreyle saklanması ve yasal otoritelerin talepleri.</li>
            <li><strong>Meşru Menfaatler (Md. 5/2-f):</strong> Sahte ihbarların önlenmesi, rate-limiting (hız sınırlaması) ve bilgi güvenliği denetimleri.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>4</span>
            Yurt Dışına Veri Aktarımı ve Yapay Zeka (AI) Servisleri
          </h2>
          <div className={styles.highlight}>
            <strong>Önemli Bilgilendirme (KVKK Md. 9):</strong> Platformumuz, kötüye kullanımı engellemek, nefret söylemlerini otomatik denetlemek ve fotoğraflardaki üçüncü kişi yüzlerini gizlemek amacıyla <strong>OpenAI (GPT-4o-mini)</strong> ve <strong>Google Cloud Vision AI</strong> teknolojilerini kullanmaktadır. Bu işlem esnasında bildirim metnindeki kişisel veriler maskelenmekle birlikte, içerik denetim verileri bu servis sağlayıcıların güvenli sunucularında işlenebilmektedir. Kayıt esnasında aldığımız açık rıza bu hususu kapsar.
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>5</span>
            Veri Saklama ve Silme Süreleri
          </h2>
          <ul className={styles.list}>
            <li><strong>Trafik Bilgileri (IP Logları):</strong> 5651 Sayılı Kanun uyarınca tam <strong>2 yıl</strong> süreyle saklanır ve ardından imha edilir.</li>
            <li><strong>Üyelik ve Bildirim Verileri:</strong> Üyeliğiniz devam ettiği sürece saklanır. Hesabınızı sildiğinizde (Unutulma Hakkı), şahsi kimlik verileriniz anında sistemden silinir veya anonim hale getirilir.</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>6</span>
            KVKK Madde 11 Uyarınca Haklarınız
          </h2>
          <ul className={styles.list}>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme ve bilgi talep etme,</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>KVKK Madde 7 uyarınca silinmesini veya yok edilmesini (Unutulma Hakkı) isteme,</li>
            <li>Yapay zeka (LLM Guardrail) tarafından aleyhinize verilen otomatik kararlara itiraz etme.</li>
          </ul>
          <div className={styles.highlight}>
            Başvurularınızı sistem üzerinden destek talebi açarak veya doğrudan <strong>destek@sorunharitasi.tr</strong> e-posta adresi üzerinden bize iletebilirsiniz. Başvurularınız en geç 30 gün içinde yanıtlanır.
          </div>
        </div>
      </div>
    </div>
  );
}
