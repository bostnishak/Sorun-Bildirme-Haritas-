-- PostGIS GiST Spatial Indexes
-- Bu migration, Prisma'nın desteklemediği PostGIS indexlerini oluşturur.
-- prisma migrate dev --name add_spatial_indexes ile çalıştırılır.

-- Issues tablosu için coğrafi index (ST_Within, ST_MakeEnvelope sorgularını hızlandırır)
CREATE INDEX IF NOT EXISTS issues_location_gist_idx
  ON issues USING GIST (location);

-- Institutions tablosu için sınır polygon indexi
CREATE INDEX IF NOT EXISTS institutions_boundary_gist_idx
  ON institutions USING GIST (boundary);

-- Full-text search için trigram indexi (başlık ve açıklama araması)
CREATE INDEX IF NOT EXISTS issues_title_trgm_idx
  ON issues USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS issues_description_trgm_idx
  ON issues USING GIN (description gin_trgm_ops);

-- Bileşik index: durum + oluşturma tarihi (en sık kullanılan sorgu kombinasyonu)
CREATE INDEX IF NOT EXISTS issues_status_created_idx
  ON issues (status, created_at DESC);

-- Şehir + ilçe + durum kombinasyonu (kurum portalı filtresi)
CREATE INDEX IF NOT EXISTS issues_city_district_status_idx
  ON issues (city, district, status);
