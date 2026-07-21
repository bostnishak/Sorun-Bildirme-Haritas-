# 👥 Etiya Project — Örnek Kullanıcı Profilleri & Demo Rehberi

Bu doküman, **Etiya Project (Türkiye Sorun Bildirim Haritası)** platformundaki örnek kullanıcı profillerini, bu profillerin yetki seviyelerini ve test edilebilecek senaryoları içermektedir.

Sistemdeki tüm test kullanıcılarının şifresi standart olarak **`Etiya2026!`** olarak tanımlanmıştır.

---

## ⚡ Hızlı Giriş Bilgileri (Tek Tıkla Demo Giriş)

Giriş sayfasında (**`/login`**) yer alan **"Hızlı Demo Giriş — Örnek Profiller"** panelindeki kartlara tıklayarak e-posta ve şifreyi otomatik doldurabilir ve hemen giriş yapabilirsiniz.

| # | Profil Tipi | Ad Soyad | E-posta | Şifre | Rol & Yetki Kapsamı |
|---|-------------|----------|---------|-------|---------------------|
| **1** | **Vatandaş** | Ayşe Yılmaz | `vatandas@etiya.com` | `Etiya2026!` | `CITIZEN` *(NVİ Doğrulandı Rozetli, Şehir: Ankara)* |
| **2** | **Çalışan (Kurum Yetkilisi)** | Mehmet Öztürk | `calisan@etiya.com` | `Etiya2026!` | `INSTITUTION_OFFICER` *(Kurum & Çözüm Yetkilisi, Şehir: İstanbul)* |
| **3** | **Süper Yönetici** | Sistem Yöneticisi | `admin@etiya.com` | `Etiya2026!` | `SUPER_ADMIN` *(Tüm Platform Yetkilisi, Şehir: İzmir)* |

---

## 🧪 Profil Bazlı Test Senaryoları

### 1. Vatandaş (`vatandas@etiya.com`)
- **Özellikler:** NVİ T.C. Kimlik doğrulaması tamamlanmıştır. Sistemde adının yanında **"Doğrulanmış Vatandaş" (NVİ Rozeti)** görüntülenir. Kayıtlı şehri **Ankara**'dır.
- **Test Edilebilecekler:**
  - Ana sayfada mobilden veya webden bağlandığında doğrudan **Ankara** şehrine smooth zoom geçişi.
  - Yeni sorun bildirme (`/issues/new` üzerinden GPS konumlu sorun oluşturma).
  - Mevcut sorunlara destek verme (Upvote) ve yorum yapma.
  - Kendi bildirdiği sorunların çözüm süreçlerini takip etme (`/my-issues`).

### 2. Çalışan (Kurum Yetkilisi) (`calisan@etiya.com`)
- **Özellikler:** Kurum sorun çözme yetkilisidir. Kayıtlı şehri **İstanbul**'dur.
- **Test Edilebilecekler:**
  - Ana sayfaya giriş yaptıktan sonra mobilde Türkiye haritası genelinden **İstanbul** il sınırlarına smooth zoom animasyonu.
  - Kurum Yönetim ve Çözüm Portalı (**`/portal`**) erişimi ve sorun yönetimi.
  - Açık/incelenen sorunların durumunu değiştirme (`OPEN` -> `IN_REVIEW` -> `RESOLVED` / `REJECTED`).
  - SLA İhlalleri, exceljs raporları ve çözüm performans verilerini görüntüleme.

### 3. Süper Yönetici (`admin@etiya.com`)
- **Özellikler:** Platformun en üst düzey yöneticisidir. Kayıtlı şehri **İzmir**'dir.
- **Test Edilebilecekler:**
  - Ana sayfada giriş yapıldığında mobilden veya webden **İzmir** il sınırlarına smooth zoom geçişi.
  - Kurum Yönetim Portalı (**`/portal`**) üzerinden tüm Türkiye genelindeki istatistikler ve denetim.
  - Kurum ekleme / düzenleme / sınır tanımlama ve sistem yönetimi.
  - AI Moderasyon logları, SLA genel raporları ve yönetici araçları.

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
