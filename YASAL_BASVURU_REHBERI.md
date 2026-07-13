# 🏛️ Türkiye Hukuki Uyumluluk — Kâr Amacı Gütmeyen / Toplumsal Fayda Projeleri İçin Canlıya Alma Rehberi

Bu rehber, **Etiya Project (Türkiye Sorun Bildirim Haritası)** platformunun **herhangi bir gelir/ticari satış amacı olmaksızın, tamamen toplumsal fayda amacıyla** halkın kullanımına açılması için Türkiye hukukuna göre izlenmesi gereken yasal süreci açıklamaktadır.

> [!IMPORTANT]
> **Şirket Kurmak veya Aylık Vergi/Muhasebeci Gideri Ödemek Şart Mıdır?**
> **HAYIR.** Platformda e-ticaret, abonelik satışı, ücretli üyelik veya ticari ürün satışı yapılmayacağı için **şirket kurma, şahıs işletmesi açma veya aylık vergi/muhasebeci gideri ödeme zorunluluğunuz YOKTUR.**
> 6563 Sayılı Elektronik Ticaret Kanunu yalnızca ticari işletmeler için MERSİS/Vergi No zorunluluğu getirir. Toplumsal fayda odaklı ücretsiz projeler **"Ticari Olmayan Yer Sağlayıcı"** statüsünde hiçbir şirketleşme gideri olmadan yayınlanabilir.

---

## 📋 Canlıya Geçiş İçin Yapmanız Gereken Ücretsiz 3 Basit İşlem

Platform kodu tarafındaki tüm teknolojik ve yasal önlemler (KVKK rıza kutuları, 5651 loglama altyapısı, PII veri maskeleme, harita lisans uyumu, uyar-kaldır başvuru sistemi) **yapay zeka tarafından tamamlanmıştır**.

Sizin yayın öncesi bizzat yapmanız gereken sadece **ücretsiz 3 basit işlem** kalmıştır:

---

### 1. 🌐 e-Devlet Üzerinden BTK "Ticari Olmayan Yer Sağlayıcı Bildirimi" (3 Dakika / Ücretsiz)

5651 Sayılı Kanun gereği, kullanıcıların ihbar, yorum veya fotoğraf yükleyebileceği internet platformlarını işletenler **Bilgi Teknolojileri ve İletişim Kurumu (BTK)** listesine bildirimde bulunmalıdır. Bu işlem tamamen ücretsizdir ve aylık hiçbir yük getirmez.

**Adım Adım Yapılışı:**
1. Tarayıcınızdan e-Devlet kapısına giriş yapın:  
   👉 **[e-Devlet — BTK Yer Sağlayıcı Bildirim Hizmeti](https://www.turkiye.gov.tr/btk-ticari-olmayan-yer-saglayici-bildirimi)**
2. Hizmet sayfasında **"Ticari Olmayan Yer Sağlayıcı Bildirimi"** seçeneğini açın.
3. **"Yeni Bildirim"** butonuna tıklayın.
4. Alan Adı (Web Sitesi) kısmına platformu yayınlayacağınız domaini (Örn: `sorunharitasi.tr` veya `.com`) girin.
5. Barındırma (Hosting) kısmına sunucuyu aldığınız sağlayıcıyı (Örn: AWS, Google Cloud, DigitalOcean vb.) yazın.
6. **Onayla ve Gönder** butonuna basarak tamamlayın. Bildiriminiz anında aktif olur.

---

### 2. 🔐 OpenAI & Google Cloud DPA (Veri İşleme Sözleşmesi) Çevrimiçi Onayı (2 Dakika / Ücretsiz)

KVKK Madde 9 uyarınca yurt dışı merkezli bulut ve yapay zeka servislerinin kullanımı için veri sorumlusu ile sağlayıcı arasında **Veri İşleme Sözleşmesi (DPA)** aktifi olmalıdır. Her iki platform da bunu tek tıkla ücretsiz sağlar:

- **OpenAI DPA Onayı:**  
  👉 **[OpenAI Data Processing Addendum Sayfası](https://openai.com/policies/data-processing-addendum)** üzerinden platform e-postanızı girerek dijital olarak onaylayın.
- **Google Cloud DPA Onayı:**  
  Google Cloud Console > **IAM & Admin > Privacy & Security** menüsündeki **"Data Processing and Security Terms"** sözleşmesini **"Accept" (Kabul Et)** butonuna basarak onaylayın.

---

### 3. 🛡️ NVİ & T.C. Kimlik Doğrulama Bilgilendirmesi (İsteğe Bağlı)

Proje test ortamında NVİ SOAP servisiyle çalışmaktadır. Canlıya geçildiğinde:
- **Güvenlik İhbarları:** Sistemimizde halihazırda kodlandığı üzere, kimliğini doğrulamamış kullanıcıların `SECURITY` (Güvenlik) kategorisinde asılsız ihbar açması engellenmektedir.
- Gelecek aşamada e-Devlet Giriş (Turkiye.gov.tr OAuth) servisine entegre olunması durumunda kimlik doğrulama yükü tamamen devlet kapısına devredilebilmektedir.

---

## 🟢 Sonuç Kıyaslama Tablosu

| Yasal Konu / Adım | Kim Yapıyor? | Maliyet / Aylık Gider | Durum |
|---|---|---|:---:|
| **Şirket Kurulumu / Vergi Mükellefiyeti** | Gerekmiyor (Ticari Değil) | **0 TL** | ✅ Kapsam Dışı |
| **KVKK Aydınlatma & Gizlilik Politikaları** | Yapay Zeka (Kodlandı) | **0 TL** | ✅ Tamamlandı |
| **5651 Uyar-Kaldır & Başvuru Sistemi** | Yapay Zeka (Kodlandı) | **0 TL** | ✅ Tamamlandı |
| **Footer & Platform Künyesi (Ticari Olmayan)** | Yapay Zeka (Kodlandı) | **0 TL** | ✅ Tamamlandı |
| **Mapbox ToS Lisans Uyumu** | Yapay Zeka (Kodlandı) | **0 TL** | ✅ Tamamlandı |
| **BTK Yer Sağlayıcı Bildirimi** | Siz (e-Devlet üzerinden 3 dk) | **0 TL** | ⏳ Canlı öncesi yapılacak |
| **OpenAI / Google Cloud DPA Onayı** | Siz (Konsoldan 1 tıkla) | **0 TL** | ⏳ Canlı öncesi yapılacak |
