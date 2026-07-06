# 🗺️ ChaosMind — Türkiye Sorun Bildirim Haritası

> **Vatandaşların şehir sorunlarını anlık olarak bildirebildiği, yetkili kurumların bu sorunları sistematik şekilde yönettiği ve çözüm sürecinin şeffaf biçimde takip edilebildiği merkezi dijital platform.**

---

## 📌 Proje Hakkında

ChaosMind, Türkiye genelinde altyapı ve şehir sorunlarını (bozuk yol, su kaçağı, sokak lambası arızası vb.) vatandaşların coğrafi olarak bildirebildiği, yetkili belediye ve kamu kurumlarının bu bildirimleri **PostGIS tabanlı bölge yönetimi** ile yönetebildiği ve çözüm sürecinin şeffaf şekilde takip edilebildiği tam yığın bir web platformudur.

### 🎯 Rol Yapısı

| Rol | Açıklama |
|-----|----------|
| **CITIZEN** | NVİ doğrulamalı kayıt; sorun bildirir ve takip eder |
| **INSTITUTION_OFFICER** | Kurumun coğrafi bölgesindeki sorunları görür ve yönetir |
| **SUPER_ADMIN** | Tüm sistemi yönetir; kurumlar oluşturur, raporlar alır |

---

## ✨ Özellikler

### Vatandaş Tarafı
- 🆔 **NVİ Kimlik Doğrulama** — T.C. Kimlik No + Ad/Soyad + Doğum Yılı ile gerçek vatandaş doğrulaması
- 📍 **GPS + EXIF Konum Doğrulama** — Fotoğraf EXIF verisi ile beyan edilen konum çapraz kontrolü
- 🗺️ **PostGIS Harita Görünümü** — Mapbox üzerinde dinamik sorun kümelemeleri (cluster)
- 🔍 **Gelişmiş Filtreleme** — Kategori, durum, il/ilçe bazlı filtreleme ve tablo görünümü
- 📸 **Görsel Gizlilik Koruması** — Google Vision AI ile yüz ve araç plakası otomatik bulanıklaştırma
- 🤖 **LLM İçerik Denetimi** — GPT-4o-mini ile alakasız/uygunsuz içeriklerin otomatik filtrelenmesi

### Kurumsal Taraf
- 🏛️ **Bölge Tabanlı Yetkilendirme** — PostGIS ST_Within ile kurumun poligon sınırları içindeki sorunlara erişim
- 🔔 **Webhook Bildirimleri** — Yeni sorun ve durum değişikliklerinde HMAC-SHA256 imzalı webhook
- 📊 **Günlük Raporlar** — BullMQ + Cron ile otomatik günlük e-posta raporları
- ⚡ **Öncelik Yönetimi** — LOW / MEDIUM / HIGH / CRITICAL öncelik seviyeleri

### Teknik Altyapı
- 🔄 **Asenkron İşlem Kuyruğu** — BullMQ + Redis ile görsel işleme ve webhook gönderimi
- 🛡️ **Çok Katmanlı Rate Limiting** — Redis tabanlı endpoint özelinde hız sınırlaması
- 📦 **S3 Uyumlu Nesne Depolama** — MinIO ile görsel dosya yönetimi
- 🔐 **JWT Token Rotasyonu** — Refresh token DB'de saklanır, her kullanımda rotate edilir

---

## 🏗️ Sistem Mimarisi

```
+----------------+     +--------------+
|     Nginx      |---->|   Frontend   |  Next.js 14 (SSR/CSR)
|  Reverse Proxy |     |    :3000     |
|   :80 / :443   |---->|   Backend    |  Express.js + TypeScript
+----------------+     |   API :3001  |
                        +------+-------+
                               |
              +----------------+----------------+
              v                v                v
        +----------+    +----------+    +----------+
        |PostgreSQL|    |  Redis   |    |  MinIO   |
        |+ PostGIS |    | Cache+Q  |    |  Object  |
        |  :5432   |    |  :6379   |    | Storage  |
        +----------+    +-----+----+    +----------+
                              |
                       +------+------+
                       |   Worker   |  BullMQ Workers
                       | Container  |  Image/Webhook/Report
                       +------------+
```

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| **Frontend** | Next.js | 14.2.x |
| **Frontend State** | Zustand | 4.5.x |
| **Frontend Data** | TanStack React Query | 5.x |
| **Harita** | Mapbox GL + react-map-gl | 3.x / 7.x |
| **Backend** | Express.js | 4.x |
| **Runtime** | Node.js | >= 20.0.0 |
| **Dil** | TypeScript | 5.5.x |
| **ORM** | Prisma | 5.14.x |
| **Veritabanı** | PostgreSQL + PostGIS | 16 / 3.4 |
| **Cache / Queue** | Redis + BullMQ | 7.2 / 5.x |
| **Nesne Depolama** | MinIO | Latest |
| **AI — İçerik** | OpenAI GPT-4o-mini | — |
| **AI — Görsel** | Google Cloud Vision | 4.x |
| **Görsel İşleme** | Sharp | 0.33.x |
| **Kimlik Doğrulama** | NVİ SOAP + JWT | — |
| **Reverse Proxy** | Nginx | 1.25 |
| **Konteyner** | Docker + Docker Compose | — |

---

## 🚀 Kurulum

### Ön Gereksinimler

- Docker & Docker Compose (önerilen yol)
- Node.js >= 20.0.0 (yerel geliştirme)
- Mapbox API Token
- OpenAI API Key
- Google Cloud Vision Service Account JSON

### 1. Ortam değişkenlerini yapılandırın

```bash
cp .env.example .env
```

`.env` dosyasındaki zorunlu değerleri doldurun:

```env
DB_USER=chaosmap_user
DB_PASSWORD=<guclu_sifre>
REDIS_PASSWORD=<guclu_sifre>
MINIO_USER=minioadmin
MINIO_PASSWORD=<guclu_sifre>
JWT_SECRET=<en_az_32_karakter_random_string>
OPENAI_API_KEY=sk-proj-...
MAPBOX_TOKEN=pk.eyJ1...
SMTP_USER=<email_adresi>
SMTP_PASS=<uygulama_sifresi>
WEBHOOK_HMAC_SECRET=<en_az_16_karakter>
```

### 2. Docker ile başlatın

```bash
docker compose up -d
```

Çalışan servisler:
- `chaosmap-db`    — PostgreSQL 16 + PostGIS 3.4
- `chaosmap-redis` — Redis 7.2
- `chaosmap-minio` — MinIO Object Storage
- `chaosmap-api`   — Backend API (:3001)
- `chaosmap-worker`— Background Worker
- `chaosmap-web`   — Frontend (:3000)
- `chaosmap-nginx` — Reverse Proxy (:80/:443)

### 3. Veritabanı migrasyonları

```bash
docker compose exec backend npm run db:migrate
```

### 4. (İsteğe bağlı) Seed verisi

```bash
docker compose exec backend npm run db:seed
```

### Yerel Geliştirme

```bash
# Backend
cd backend && npm install
npm run dev        # API — port 3001
npm run dev:worker # Background worker

# Frontend (ayrı terminal)
cd frontend && npm install
npm run dev        # Next.js — port 3000
```

---

## 📡 API Referansı

### Kimlik Doğrulama

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | /api/v1/auth/register | NVİ doğrulamalı kayıt | — |
| POST | /api/v1/auth/login | Giriş, token çifti döner | — |
| POST | /api/v1/auth/refresh | Access token yenileme | — |
| POST | /api/v1/auth/logout | Refresh token iptal | Bearer |
| GET  | /api/v1/auth/me | Mevcut kullanıcı bilgisi | Bearer |

### Sorunlar (Issues)

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET    | /api/v1/issues | Sayfalı sorun listesi | Optional |
| POST   | /api/v1/issues | Yeni sorun bildir | Bearer |
| GET    | /api/v1/issues/map-cluster | Harita cluster verisi | Optional |
| GET    | /api/v1/issues/:id | Sorun detayı | Optional |
| PATCH  | /api/v1/issues/:id/status | Durum güncelle | Bearer (Officer/Admin) |
| DELETE | /api/v1/issues/:id | Sorun sil | Bearer (Admin) |

### Admin Portalı

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET  | /api/v1/admin/issues | Portal sorun listesi | Bearer (Officer/Admin) |
| GET  | /api/v1/admin/stats | İstatistikler | Bearer (Officer/Admin) |
| GET  | /api/v1/admin/institutions | Kurum listesi | Bearer (Admin) |
| POST | /api/v1/admin/institutions | Kurum oluştur | Bearer (Admin) |

---

## 🔐 Güvenlik

| Özellik | Detay |
|---------|-------|
| NVİ Entegrasyonu | Yalnızca gerçek T.C. kimliği ile kayıt |
| JWT Token Rotasyonu | Her refresh'te yeni token, eski geçersiz |
| TC Kimlik Hashleme | SHA-256 + salt; plaintext asla saklanmaz (KVKK) |
| Rate Limiting | Global: 100 req/dk | Auth: 10 req/saat | Issue: 5 req/dk |
| LLM İçerik Denetimi | GPT-4o-mini ile sahte/uygunsuz içerik filtreleme |
| EXIF Doğrulama | Konum sapması >= 5 km ise işaretlenir |
| Görsel Gizlilik | Google Vision ile yüz + plaka bulanıklaştırma |
| Webhook HMAC | X-ChaosMind-Signature: sha256=<hmac> |
| HTTPS Only | Nginx TLS 1.2+; HTTP -> HTTPS redirect |
| PostGIS Yetki | Kurum yetkilisi sadece kendi poligonundaki sorunları görür |

---

## 📁 Proje Yapısı

```
Etiya_Project/
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── prisma/
│   │   ├── schema.prisma      # User, Issue, Institution, RefreshToken, IssueStatusHistory
│   │   └── migrations/
│   └── src/
│       ├── index.ts           # Express app entry
│       ├── config/            # env (Zod), database (Prisma), redis
│       ├── middleware/        # auth, rateLimiter, upload
│       ├── modules/
│       │   ├── auth/          # register, login, refresh, logout, me
│       │   ├── issues/        # CRUD + map-cluster
│       │   └── admin/         # portal, stats, institutions
│       ├── services/
│       │   ├── exif.service   # EXIF konum doğrulama
│       │   ├── llm.service    # GPT-4o-mini içerik denetimi
│       │   ├── nvi.service    # NVİ SOAP kimlik doğrulama
│       │   ├── storage.service# MinIO yönetimi
│       │   ├── vision.service # Google Vision blur
│       │   └── webhook.service# HMAC imzalı webhook
│       ├── jobs/
│       │   ├── workers/       # imageProcessor, webhookDispatcher, reportGenerator
│       │   └── schedulers/    # dailyReport.cron
│       └── utils/             # logger, errors, spatial utils
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── app/               # Next.js App Router
│       ├── components/        # layout, map, table, forms, ui
│       ├── lib/               # API istemci
│       ├── store/             # Zustand
│       └── styles/
├── nginx/
│   └── nginx.conf
└── shared/
    └── types/
```

---

## 🗄️ Veri Modeli

```
User ──────────────── RefreshToken
 |
 +── Issue ─────────── IssueStatusHistory
       |
       +── PostGIS Point (location)

Institution ─────────── User[]
      |
      +── PostGIS MultiPolygon (boundary)
```

### Sorun Durumları

```
OPEN  -->  IN_REVIEW  -->  RESOLVED
  |
  +------------------------------>  REJECTED
```

### Sorun Kategorileri

- WATER_SANITATION — Su ve Kanalizasyon
- TRANSPORTATION — Yol / Ulaşım
- ENVIRONMENT — Çevre ve Temizlik
- INFRASTRUCTURE — Altyapı
- SECURITY — Güvenlik
- LIGHTING — Aydınlatma
- PARKS — Park ve Yeşil Alan

---

## 🔄 Arka Plan İşleri

### Image Processor Worker
1. Google Vision AI yüz + plaka tespiti
2. Tespit edilen bölgelere blur uygulanır
3. WebP formatına dönüştürülür (quality: 85)
4. MinIO'ya yüklenir
5. DB imageUrl ve imageBlurred güncellenir

### Webhook Dispatcher Worker
1. Sorumlu kurumun webhookUrl'ine POST
2. HMAC-SHA256 imzalı başlıklar
3. BullMQ otomatik retry mekanizması

### Daily Report Cron (08:00 Istanbul)
1. Her kurum için günlük özet
2. E-posta ile kurum sorumlularına gönderim

---

## 🧪 Test

```bash
cd backend
npm run test          # Unit testler
npm run test:e2e      # E2E testler
npm run test:coverage # Coverage raporu
```

---

## 📊 MinIO Console

```
URL:      http://localhost:9001
User:     MINIO_USER (.env)
Password: MINIO_PASSWORD (.env)
```

---

## 🤝 Commit Mesaj Kuralları

```
feat:     Yeni özellik
fix:      Hata düzeltme
docs:     Dokümantasyon
refactor: Yeniden düzenleme
test:     Test
chore:    Build, CI, bağımlılık
```

---

## 📄 Yasal

Platform KVKK uyumlu geliştirilmektedir. TC Kimlik numaraları hiçbir zaman açık metin olarak saklanmaz.

- /kvkk — KVKK Aydınlatma Metni
- /gizlilik — Gizlilik Politikası
- /kullanim-kosullari — Kullanım Koşulları
