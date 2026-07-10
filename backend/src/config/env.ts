import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // MinIO
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().default('9000').transform(Number),
  MINIO_USE_SSL: z.string().default('false').transform(v => v === 'true'),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().default('chaosmap-media'),
  MINIO_PUBLIC_URL: z.string().url().default('http://localhost:9000'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // AI & Geocoding
  OPENAI_API_KEY: z.string().min(40, 'OpenAI API key gereklidir').optional()
    .refine(key => process.env.NODE_ENV !== 'production' || key, 'Production için OPENAI_API_KEY zorunlu'),
  GOOGLE_VISION_CREDENTIALS_JSON: z.string().optional(),
  MAPBOX_TOKEN: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // NVİ
  NVI_ENDPOINT: z.string().url().default('https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx'),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('ChaosMind <noreply@chaosmap.tr>'),

  // Webhooks
  WEBHOOK_HMAC_SECRET: z.string().default('dev_secret_key_1234'),

  // CORS — virgülle ayrılmış birden fazla origin desteklenir
  CORS_ORIGIN: z.string().default('http://localhost:3000').transform((val) => val.split(',').map((s) => s.trim())),
  // TC Kimlik Hash Salt (JWT_SECRET'tan bağımsız — asla değiştirme!)
  TC_KIMLIK_PEPPER: z.string().default('dev_pepper_key_12345'),

  // Prometheus / Observability
  METRICS_TOKEN: z.string().optional(),

  // Uygulama URL'si — webhook ve e-posta bağlantıları için
  APP_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Production Güvenlik Kontrolü: Default secret'ların production'da kullanılmasını engelle
if (parsed.data.NODE_ENV === 'production') {
  if (
    parsed.data.WEBHOOK_HMAC_SECRET === 'dev_secret_key_1234' ||
    parsed.data.TC_KIMLIK_PEPPER === 'dev_pepper_key_12345'
  ) {
    console.error('❌ CRITICAL SECURITY ERROR: Production ortamında varsayılan WEBHOOK_HMAC_SECRET veya TC_KIMLIK_PEPPER kullanılamaz.');
    process.exit(1);
  }
}

export const env = parsed.data;
export type Env = typeof env;
