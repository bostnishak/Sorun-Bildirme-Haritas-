# ChaosMind — Yatırımcı Sunumu & Yönetici Özeti (Pitch Deck)

> **"Türkiye'nin Yeni Nesil, Yapay Zeka Destekli ve Harita Tabanlı Kentsel Çözüm ve Şeffaf Katılım Platformu"**

---

## 1. Executive Summary & Problem Tanımı

### ❌ Mevcut Kentsel Bildirim Sistemlerinin (153 / Beyaz Masa) Problemleri
1. **Kara Kutu & Şeffaflık Eksikliği:** Vatandaş bildirim yaptığında sürecin hangi aşamada olduğunu göremez, çözülüp çözülmediğini denetleyemez.
2. **Sahte ve Tekrarlayan İhbarlar:** Mevcut sistemler fotoğrafın gerçekten o konumda çekilip çekilmediğini (EXIF/GPS sapması) veya görselin alakalı olup olmadığını denetleyemez.
3. **Veri Siloları ve Analitik Eksikliği:** Belediyeler kentsel sorunların kronikleştiği bölgeleri dinamik ısı haritalarıyla analiz etmekte ve SLA süresi takibinde yetersiz kalmaktadır.

---

## 2. ChaosMind Çözümü & Değer Önerisi

**ChaosMind**, vatandaşlar ile yerel yönetimler arasında **akıllı, doğrulanmış ve gerçek zamanlı** bir köprü kurar:

- **📍 PostGIS Coğrafi Sınır Otomasyonu:** Bildirilen sorunun koordinatı (`ST_Within`), Türkiye'nin 81 ilindeki kurumsal poligonlarla eşleştirilerek doğrudan sorumlu kuruma yönlendirilir.
- **🤖 AI LLM Guard & EXIF Doğrulama:** Yüklenen görsellerin GPS metaverileri ile harita seçimi karşılaştırılır; yapay zeka ile küfürlü, ilgisiz veya sahte içerikler otomatik filtrelenir.
- **💬 Çift Yönlü İletişim & PWA:** Vatandaşlar mobil cihazlarından uygulamayı ana ekranlarına yükleyerek (`Progressive Web App`) bildirimlerini takip eder ve belediye yetkililerinden resmi açıklama alırlar.

---

## 3. Teknoloji Stack & Mimarisi

```
[ Mobil / PWA Next.js 14 Frontend ] <── REST / React Query ──> [ Node.js Express Backend ]
                                                                       │
    ┌──────────────────────────────┬───────────────────────────────────┼─────────────────────────────┐
    ▼                              ▼                                   ▼                             ▼
[ PostgreSQL + PostGIS ]     [ Redis + BullMQ ]              [ MinIO Object Store ]      [ Webhook / 153 CRM ]
 (Coğrafi İndeksleme)     (Kuyruk & Önbellekleme)          (Görsel & Medya Saklama)     (Belediye Entegrasyonu)
```

| Katman | Teknolojiler | Avantajı |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Mapbox GL JS, PWA | SEO uyumlu, SSR/CSR dengeli, yüksek harita performansı ve mobil native hissiyat |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod Validation | Tip güvenli, modüler mimari, JWT + Role-Based Access Control (RBAC) |
| **Veritabanı** | PostgreSQL + PostGIS, Redis | Coğrafi sorgu optimizasyonu (`ST_Within`, Cluster önbellekleme) |
| **Asenkron Kuyruk** | BullMQ + Redis | LLM görsel analizi, EXIF doğrulaması ve Webhook iletimi için arka plan işleyiciler |
| **DevOps & Güvenlik** | Docker, Docker Compose, GitHub Actions CI/CD | Sıfır kesintiyle canlıya alım, Prometheus metrik koruması ve Fail-Fast env kilidi |

---

## 4. Gelir ve İş Modeli (B2G / SaaS)

1. **Belediye & Kamu Kurumları Lisanslaması (B2G SaaS):**
   - Kurum Yönetim Paneli, Isı Haritası Analitikleri, SLA Süre Takibi ve Akıllı Raporlama modülleri için yıllık abonelik.
2. **153 Beyaz Masa Entegrasyon API / Webhook:**
   - Mevcut belediye CRM ve çağrı merkezi yazılımlarıyla çift yönlü HMAC-SHA256 imzalı güvenli webhook entegrasyonu.
3. **Akıllı Şehir Veri Analitiği:**
   - Altyapı, su, ulaşım ve aydınlatma arızalarının yoğunlaştığı coğrafi bölgelerin anonimleştirilmiş prediktif analiz raporları.

---

## 5. Canlıya Alma (Production Deployment) Rehberi

Proje tek bir komutla tüm mikroservisleriyle (PostgreSQL, Redis, MinIO, Backend, Frontend) üretime hazır olarak çalıştırılabilir:

```bash
# 1. Depoyu klonlayın ve dizine girin
cd Etiya_Project

# 2. Production ortam değişkenlerini hazırlayın
cp .env.example .env

# 3. Docker Compose ile tüm platformu başlatın
docker compose up -d --build
```

### Sunucu Üzerinde Doğrulama (Docker Nginx Reverse Proxy)
- **Vatandaş Portalı & Harita:** `http://localhost` (Port 80)
- **Kurumsal Paketler & B2G Yatırımcı Panosu:** `http://localhost/pricing`
- **Kurum Yönetim Paneli / Portal:** `http://localhost/portal`
- **Backend API Sağlık Kontrolü:** `http://localhost/health`
