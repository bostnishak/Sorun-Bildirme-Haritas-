import 'express-async-errors';
import './config/tracing'; // MUST BE THE VERY FIRST IMPORT
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './utils/logger';
import { isAppError, AppError } from './utils/errors';
import { globalRateLimit } from './middleware/rateLimiter.middleware';
import { ensureBucketExists } from './services/storage.service';

// Routers
import { authRouter } from './modules/auth/auth.router';
import { issuesRouter } from './modules/issues/issues.router';
import { adminRouter } from './modules/admin/admin.router';
import { legalRouter } from './modules/legal/legal.router';

import { initSentry } from './utils/sentry';
import { metricsMiddleware, getMetrics } from './utils/metrics';
import * as Sentry from '@sentry/node';

// Sentry Init (app'ten önce çalışmalı)
initSentry();

const app = express();

// ─── Trust Proxy (Nginx arkasında) ────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// NOT: Fotoğraf yükleme endpoint'leri kendi multer limitlerine (30MB) sahip

// ─── Logging ──────────────────────────────────────────────────────────────
morgan.token('filtered-url', (req) => {
  const url = req.url || '';
  return url.replace(/(token|password|key|refresh)=[^&]+/gi, '$1=***');
});

const customLogFormat = ':remote-addr - :remote-user [:date[clf]] ":method :filtered-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

app.use(morgan(customLogFormat, {
  stream: { write: (message) => logger.http(message.trim()) },
  skip: (req) => req.url === '/health',
}));

// ─── Prometheus Metrikleri ────────────────────────────────────────────────
app.use(metricsMiddleware);

app.get('/metrics', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '';
  // Docker private network aralıklarını doğru CIDR ile kontrol et
  const isInternalOrLoopback =
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp === '::ffff:127.0.0.1' ||
    clientIp.startsWith('10.') ||
    clientIp.startsWith('192.168.') ||
    // 172.16.0.0 - 172.31.255.255 (Docker default bridge)
    (() => {
      if (clientIp.startsWith('172.')) {
        const second = parseInt(clientIp.split('.')[1] ?? '0', 10);
        return second >= 16 && second <= 31;
      }
      return false;
    })();
  const tokenHeader = req.headers['x-metrics-token'] || (req.headers['authorization'] as string)?.replace('Bearer ', '');

  if (env.METRICS_TOKEN && tokenHeader !== env.METRICS_TOKEN) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim.' } });
    return;
  } else if (!env.METRICS_TOKEN && env.NODE_ENV === 'production' && !isInternalOrLoopback) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Metrikler sadece iç ağdan erişilebilir.' } });
    return;
  }

  res.set('Content-Type', 'text/plain');
  res.send(await getMetrics());
});

// ─── Global Rate Limit ────────────────────────────────────────────────────
app.use(globalRateLimit);

import { setupSwagger } from './config/swagger';

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const { prisma } = await import('./config/database');
    const { redis } = await import('./config/redis');
    const { env } = await import('./config/env');
    
    // DB & Redis Checks
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();

    // Minio Check
    let minioStatus = 'ok';
    try {
      const { minio } = await import('./services/storage.service');
      await minio.listBuckets();
    } catch {
      minioStatus = 'failed';
    }

    // OpenAI Check - Canlı ortamda container health check bloklanmaması için sadece yapılandırma kontrolü
    const openaiStatus = env.OPENAI_API_KEY ? 'ok' : 'unconfigured';
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: { db: 'ok', redis: 'ok', minio: minioStatus, openai: openaiStatus },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
    });
  }
});

// ─── API Routes & Documentation ───────────────────────────────────────────
setupSwagger(app);

import { notificationRouter } from './modules/notifications/notification.router';
import { mediaRouter } from './modules/media/media.router';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/issues', issuesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/legal', legalRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/media', mediaRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Bu endpoint mevcut değil: ${req.method} ${req.originalUrl}`,
    },
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────

// Sentry Error Handler (Route'lardan sonra, diğer error handler'lardan önce olmalı)
Sentry.setupExpressErrorHandler(app);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (isAppError(err)) {
    // Operational hatalar — güvenli şekilde client'a döndür
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.constructor.name.replace('Error', '').toUpperCase(),
        message: err.message,
      },
    });
  } else {
    // Beklenmeyen hatalar — güvenli hata mesajı döndür
    logger.error('Beklenmeyen hata:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      },
    });
  }
});

// ─── Server Başlatma ──────────────────────────────────────────────────────
import { createServer } from 'http';
import { initSocket } from './config/socket';

async function bootstrap() {
  // MinIO bucket
  try {
    await ensureBucketExists();
  } catch (err) {
    logger.warn('[WARN] MinIO bucket oluşturulamadı, MinIO servisi ayakta olmayabilir.', err);
  }

  const httpServer = createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    logger.info(`[INFO] Etiya Project API başlatıldı: http://localhost:${env.PORT}`);
    logger.info(`[ENV] Ortam: ${env.NODE_ENV}`);
    logger.info('[SOCKET] Socket.io aktif.');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} — sunucu kapatılıyor...`);
    server.close(async () => {
      try {
        // Veritabanı bağlantısını kapat
        const { prisma } = await import('./config/database');
        await prisma.$disconnect();
        logger.info('[OK] Prisma bağlantısı kapatıldı');

        // Redis bağlantısını kapat
        const { redis } = await import('./config/redis');
        await redis.quit();
        logger.info('[OK] Redis bağlantısı kapatıldı');

        // BullMQ worker'ları kapat
        try {
          const { imageProcessorWorker } = await import('./jobs/workers/imageProcessor.worker');
          const { reportGeneratorWorker } = await import('./jobs/workers/reportGenerator.worker');
          await Promise.allSettled([
            imageProcessorWorker.close(),
            reportGeneratorWorker.close(),
          ]);
          logger.info('[OK] BullMQ worker\'lar kapatıldı');
        } catch {
          logger.warn('[WARN] BullMQ worker kapatma hatası (devam ediliyor)');
        }

        logger.info('[OK] Sunucu temiz şekilde kapatıldı');
        process.exit(0);
      } catch (err) {
        logger.error('Kapatma sırasında hata:', err);
        process.exit(1);
      }
    });

    // Force exit (30 saniye içinde kapanmazsa)
    setTimeout(() => process.exit(1), 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

if (!process.env.JEST_WORKER_ID && env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.error('Bootstrap hatası:', err);
    process.exit(1);
  });
}

export { app };
