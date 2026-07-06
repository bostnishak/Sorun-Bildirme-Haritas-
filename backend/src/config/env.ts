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

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // AI
  OPENAI_API_KEY: z.string().min(1),
  GOOGLE_VISION_CREDENTIALS_JSON: z.string().optional(),

  // NVİ
  NVI_ENDPOINT: z.string().url().default('https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx'),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().default('Etiya Project <noreply@chaosmap.tr>'),

  // Webhooks
  WEBHOOK_HMAC_SECRET: z.string().min(16),

  // CORS — virgülle ayrılmış birden fazla origin desteklenir
  CORS_ORIGIN: z.string().default('http://localhost:3000').transform((val) => val.split(',').map((s) => s.trim())),
  // TC Kimlik Hash Salt (JWT_SECRET'tan bağımsız — asla değiştirme!)
  TC_KIMLIK_PEPPER: z.string().min(16, 'TC_KIMLIK_PEPPER must be at least 16 characters'),

  // Uygulama URL'si — webhook ve e-posta bağlantıları için
  APP_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
