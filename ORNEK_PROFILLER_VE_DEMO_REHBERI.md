# 👥 Etiya Project — Örnek Kullanıcı Profilleri & Demo Rehberi

Bu doküman, **Etiya Project (Türkiye Sorun Bildirim Haritası)** platformundaki örnek kullanıcı profillerini, bu profillerin yetki seviyelerini ve test edilebilecek senaryoları içermektedir.

Sistemdeki tüm test kullanıcılarının şifresi standart olarak **`Etiya2026!`** olarak tanımlanmıştır.

---

## ⚡ Hızlı Giriş Bilgileri (Tek Tıkla Demo Giriş)

Giriş sayfasında (**`/login`**) yer alan **"Hızlı Demo Giriş — Örnek Profiller"** panelindeki kartlara tıklayarak e-posta ve şifreyi otomatik doldurabilir ve hemen giriş yapabilirsiniz.

| # | Profil Tipi | Ad Soyad | E-posta | Şifre | Rol & Yetki Kapsamı |
|---|-------------|----------|---------|-------|---------------------|
| **1** | **Doğrulanmış Vatandaş** | Ayşe Yılmaz | `vatandas@etiya.com` | `Etiya2026!` | `CITIZEN` *(NVİ Doğrulandı Rozetli)* |
| **2** | **Standart Vatandaş** | Ahmet Demir | `ahmet@example.com` | `Etiya2026!` | `CITIZEN` *(Standart Kayıt)* |
| **3** | **Kurum Yetkilisi (İBB)** | Zeynep Kaya | `ibb.yetkili@istanbul.bel.tr` | `Etiya2026!` | `INSTITUTION_OFFICER` *(İstanbul Sınırları)* |
| **4** | **Kurum Yetkilisi (ABB)** | Mehmet Öztürk | `abb.yetkili@ankara.bel.tr` | `Etiya2026!` | `INSTITUTION_OFFICER` *(Ankara Sınırları)* |
| **5** | **Kurum Yetkilisi (İZBB)** | Selin Aydın | `izmir.yetkili@izmir.bel.tr` | `Etiya2026!` | `INSTITUTION_OFFICER` *(İzmir Sınırları)* |
| **6** | **Süper Yönetici** | Sistem Yöneticisi | `admin@etiya-project.com` | `Etiya2026!` | `SUPER_ADMIN` *(Tüm Platform Yetkisi)* |

---

## 🧪 Profil Bazlı Test Senaryoları

### 1. Doğrulanmış Vatandaş (`vatandas@etiya.com`)
- **Özellikler:** NVİ T.C. Kimlik doğrulaması tamamlanmıştır. Sistemde adının yanında **"Doğrulanmış Vatandaş" (NVİ Rozeti)** görüntülenir.
- **Test Edilebilecekler:**
  - Yeni sorun bildirme (`/issues/new` üzerinden GPS konumlu sorun oluşturma)
  - Mevcut sorunlara destek verme (Upvote)
  - Sorunlara yorum yapma
  - Kendi bildirdiği sorunların çözüm süreçlerini takip etme (`/my-issues`)

### 2. Standart Vatandaş (`ahmet@example.com`)
- **Özellikler:** E-posta ile kayıt olmuştur, henüz NVİ doğrulaması yapmamıştır.
- **Test Edilebilecekler:**
  - Sorun bildirme ve harita üzerinde filtreleme
  - Profil sayfasından sonradan T.C. Kimlik doğrulaması yaparak rozet kazanma akışı

### 3. Kurum Yetkilisi — İstanbul Büyükşehir Belediyesi (`ibb.yetkili@istanbul.bel.tr`)
- **Özellikler:** PostGIS `ST_Within` coğrafi yetkilendirmesi ile yalnızca **İstanbul** il sınırları içerisindeki sorunları yönetme yetkisine sahiptir.
- **Test Edilebilecekler:**
  - Kurum Yönetim Portalı (**`/portal`**)
  - İstanbul bölgesindeki açık/incelenen sorunların durumunu değiştirme (`OPEN` -> `IN_REVIEW` -> `RESOLVED` / `REJECTED`)
  - SLA İhlalleri ve Çözüm Performans Raporlarını görüntüleme

### 4. Kurum Yetkilisi — Ankara Büyükşehir Belediyesi (`abb.yetkili@ankara.bel.tr`)
- **Özellikler:** Yalnızca **Ankara** il sınırları içerisindeki sorunları (örneğin Dikmen Caddesi Su Patlağı, Turan Güneş Bulvarı Çukur vb.) görür ve yönetir.

### 5. Kurum Yetkilisi — İzmir Büyükşehir Belediyesi (`izmir.yetkili@izmir.bel.tr`)
- **Özellikler:** Yalnızca **İzmir** il sınırları içerisindeki sorunları (örneğin Alsancak Kordon, Karşıyaka Çarşı vb.) görür ve yönetir.

### 6. Süper Yönetici (`admin@etiya-project.com`)
- **Özellikler:** Platformun en üst düzey yetkilisidir.
- **Test Edilebilecekler:**
  - Kurum Yönetim Portalı ve tüm Türkiye genelindeki istatistikler
  - Kurum ekleme / düzenleme / sınır tanımlama
  - Webhook DLQ (Dead-Letter Queue) yönetimi
  - AI Moderasyon logları ve SLA genel raporları

---

## 🗺️ Seed Edilmiş Hazır Sorun Listesi (12 Adet)

Veritabanında **İstanbul**, **Ankara** ve **İzmir** illerini kapsayan 12 adet gerçekçi sorun hazır olarak bulunmaktadır:

1. **İstanbul / Kadıköy:** Kadıköy Rıhtım Rögar Taşması *(CRITICAL - İnceleniyor)*
2. **İstanbul / Beşiktaş:** Beşiktaş Barbaros Bulvarı Derin Çukur *(HIGH - Açık)*
3. **İstanbul / Şişli:** Mecidiyeköy Altgeçit Aydınlatma Arızası *(MEDIUM - İnceleniyor)*
4. **İstanbul / Üsküdar:** Salacak Sahil Yolu Temizlik Sorunu *(MEDIUM - Çözüldü)*
5. **Ankara / Çankaya:** Turan Güneş Bulvarı Çukur *(HIGH - Açık)*
6. **Ankara / Çankaya:** Dikmen Caddesi Ana Su Patlağı *(CRITICAL - İnceleniyor)*
7. **Ankara / Çankaya:** Güvenpark Yanı Kırık Banklar *(LOW - Çözüldü)*
8. **Ankara / Yenimahalle:** İvedik OSB Ana Yolda Çökme *(HIGH - İnceleniyor)*
9. **İzmir / Konak:** Alsancak Kordon Sahil Yolu Bakım İhtiyacı *(MEDIUM - Açık)*
10. **İzmir / Karşıyaka:** Karşıyaka Çarşı Girişi Kanalizasyon Taşması *(CRITICAL - İnceleniyor)*
11. **İzmir / Bornova:** Bornova Üniversite Caddesi Aydınlatma Arızası *(MEDIUM - Açık)*
12. **İzmir / Konak:** Göztepe Sahil Güvenlik Korkuluk Hasarı *(HIGH - Çözüldü)*

---

## 🔄 Verileri Sıfırlama ve Yeniden Yükleme

Geliştirme veya test sonrasında örnek verileri sıfırlayıp baştan yüklemek isterseniz aşağıdaki komutu çalıştırabilirsiniz:

```bash
# Docker üzerinde API container'ı içinden seed çalıştırma
docker exec etiya-project-api npm run db:seed

# Veya yerel backend dizini içinden
cd backend
npm run db:seed
```
