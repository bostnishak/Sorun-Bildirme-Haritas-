import 'express-async-errors';
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

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
  skip: (req) => req.url === '/health',
}));

// ─── Prometheus Metrikleri ────────────────────────────────────────────────
app.use(metricsMiddleware);

app.get('/metrics', async (_req: Request, res: Response) => {
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
    
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: { db: 'ok', redis: 'ok' },
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

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/issues', issuesRouter);
app.use('/api/v1/admin', adminRouter);

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
    logger.warn('⚠️ MinIO bucket oluşturulamadı, MinIO servisi ayakta olmayabilir.', err);
  }

  const httpServer = createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    logger.info(`🚀 ChaosMind API başlatıldı: http://localhost:${env.PORT}`);
    logger.info(`📍 Ortam: ${env.NODE_ENV}`);
    logger.info('🔌 Socket.io aktif.');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} — sunucu kapatılıyor...`);
    server.close(async () => {
      const { prisma } = await import('./config/database');
      await prisma.$disconnect();
      logger.info('✅ Sunucu kapatıldı');
      process.exit(0);
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

bootstrap().catch((err) => {
  logger.error('Bootstrap hatası:', err);
  process.exit(1);
});

export { app };
