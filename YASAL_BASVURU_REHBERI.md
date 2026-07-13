# 🏛️ Türkiye Hukuki Uyumluluk — Canlıya Alma Öncesi İdari ve Resmi İşlemler Rehberi

Bu rehber, **Etiya Project (Türkiye Sorun Bildirim Haritası)** platformunun canlıya alınması ve reklamların başlatılması öncesinde **platform sahibi (veri sorumlusu/yer sağlayıcı)** tarafından e-Devlet ve ilgili kurumlar üzerinden bizzat yapılması gereken 4 resmi işlemin adım adım kılavuzudur.

---

## 1. 🌐 e-Devlet Üzerinden BTK "Yer Sağlayıcı Bildirimi" Yapılması (5 Dakika / Ücretsiz)

5651 Sayılı Kanun uyarınca, kullanıcıların ihbar ve yorum barındırabileceği internet platformlarını işletenler **Bilgi Teknolojileri ve İletişim Kurumu (BTK)** listesine "Yer Sağlayıcı" olarak bildirimde bulunmak zorundadır.

### Adım Adım Yapılışı:
1. Tarayıcınızdan e-Devlet kapısına giriş yapın:  
   👉 **[e-Devlet — BTK Yer Sağlayıcı Bildirim Hizmeti](https://www.turkiye.gov.tr/btk-ticari-olmayan-yer-saglayici-bildirimi)**
2. Arama kutusuna **"Ticari Olmayan Yer Sağlayıcı Bildirimi"** (veya kurumsal açıyorsanız "Ticari Yer Sağlayıcı Bildirimi") yazın.
3. **"Yeni Bildirim"** butonuna tıklayın.
4. İstenen alanları doldurun:
   - **Web Sitesi Adresi (Alan Adı):** `domaininiz.tr` (veya `.com`)
   - **Barındırma Hizmeti Verilen Yer:** Sunucularınızın bulunduğu bulut sağlayıcı (Örn: AWS, Google Cloud, DigitalOcean veya Türkiye içi veri merkezi)
5. **Onayla ve Gönder** butonuna basarak işleminizi tamamlayın. Başvurunuz anında aktifleşir.

---

## 2. 🔐 OpenAI & Google Cloud DPA (Veri İşleme Sözleşmesi) Çevrimiçi Onayı

KVKK Madde 9 uyarınca yurt dışı merkezli bulut ve yapay zeka servislerinin kullanımı için veri sorumlusu ile sağlayıcı arasında **Veri İşleme Sözleşmesi (Data Processing Addendum - DPA)** yürürlükte olmalıdır.

### A) OpenAI DPA Onayı (2 Dakika)
1. Tarayıcınızdan OpenAI yasal portalına girin:  
   👉 **[OpenAI Data Processing Addendum (DPA) Sayfası](https://openai.com/policies/data-processing-addendum)**
2. Platformda kullandığınız OpenAI API hesabının **Kurumsal E-posta Adresini** ve **Şirket/Platform Adını** girerek elektronik imza ile formu onaylayın.
3. OpenAI size imzalı DPA PDF kopyasını e-posta ile iletecektir; bu belgeyi KVKK denetimleri için dijital arşivinizde saklayın.

### B) Google Cloud DPA Onayı (2 Dakika)
1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)) üzerinde platform hesabınızla oturum açın.
2. Sağ üst menüden veya sol menüden **IAM & Admin > Privacy & Security (Gizlilik ve Güvenlik)** bölümüne gidin.
3. **"Data Processing and Security Terms" (Veri İşleme ve Güvenlik Şartları)** sekmesini açarak **"Review and Accept" (İncele ve Kabul Et)** butonuna tıklayın.

---

## 3. 🏢 Resmi Muhataplık & Şirket / STK Statüsü

Platform üzerinden reklam verilmesi ve halkın kullanımına sunulması durumunda yasal muhataplık için en pratik yöntemler şunlardır:

### Seçenek A: Şahıs İşletmesi Açılışı (En Hızlı & Ücretsiz Dijital Başvuru)
Eğer henüz bir şirketiniz yoksa, İnteraktif Vergi Dairesi üzerinden noter veya muhasebeci beklemeden dijital şahıs işletmesi açabilirsiniz:
1. **[ivd.gib.gov.tr](https://ivd.gib.gov.tr)** adresine e-Devlet şifrenizle giriş yapın.
2. **İşlem Başlat > Mükellefiyet İşlemleri > İşe Başlama Bildirimi** menüsünü seçin.
3. Faaliyet Kodu (NACE Kodu) olarak **"62.01.01 - Bilgisayar Programlama Faaliyetleri / Web Portalları"** seçerek başvurunuzu iletin.

### Seçenek B: STK veya Üniversite / Kulüp Çatısı Altında Yayınlama
Projeyi stajyer arkadaşlarla sosyal sorumluluk / halk hizmeti amacıyla yürüttüğünüz için bir üniversite kulübü, sivil toplum kuruluşu (STK) veya dernek iş birliğiyle platformu onların yasal kimliği altında yayına alabilirsiniz.

---

## 4. 🪪 NVİ (Nüfus ve Vatandaşlık İşleri) İzin Teyidi

Platformumuz geliştirme ve test sürecinde NVİ'nin genel T.C. Kimlik No Doğrulama SOAP servisiyle çalışmaktadır. Canlı yayın öncesinde kurumsal güvence sağlamak için:

1. **İletişim & Dilekçe Kanalları:**
   - **T.C. İçişleri Bakanlığı NVİ Genel Müdürlüğü Bilgi Teknolojileri Dairesi Başkanlığı**'na veya
   - **T.C. Cumhurbaşkanlığı Dijital Dönüşüm Ofisi (DDO)** portalına proje özetinizle birlikte yazılı veya KEP adresi üzerinden bilgilendirme iletebilirsiniz.
2. **Alternatif Yasal Çözüm:**  
   Gelecekte doğrudan e-Devlet ile Giriş (Turkiye.gov.tr OAuth / SAML entegrasyonu) kullanılması, kimlik doğrulama sorumluluğunu tamamen e-Devlet kapısına devrederek platformu en güvenli hukuki konuma taşır.
