import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// ─── Rate Limiter Tanımları ────────────────────────────────────────────────

/**
 * Global limiter: tüm API isteklerine uygulanan temel koruma
 * 100 istek / dakika / IP
 */
export const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_global',
  points: 100,
  duration: 60,
  blockDuration: 60,
});

/**
 * Auth limiter: brute force koruması
 * 10 istek / saat / IP
 */
export const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 10,
  duration: 3600,
  blockDuration: 3600,
});

/**
 * Issue oluşturma limiter: spam koruması
 * 5 istek / dakika / IP
 */
export const issueCreateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_issue_create',
  points: 5,
  duration: 60,
  blockDuration: 300, // 5 dakika block
});

/**
 * Chatbot limiter: AI maliyet kontrolü
 * 10 istek / dakika / IP
 */
export const chatbotLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_chatbot',
  points: 10,
  duration: 60,
  blockDuration: 300, // 5 dakika block
});

/**
 * NVİ doğrulama limiter: sistemi aşırı yüklemeden korur
 * 3 istek / saat / IP
 */
export const nviLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_nvi',
  points: 3,
  duration: 3600,
  blockDuration: 7200, // 2 saat block
});

// ─── Middleware Factory ────────────────────────────────────────────────────

/**
 * Rate limiter middleware oluşturur
 */
export function createRateLimitMiddleware(limiter: RateLimiterRedis) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // IP adresi (X-Forwarded-For Nginx'ten gelir)
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';

    try {
      const result = await limiter.consume(clientIp);

      // Rate limit başlıkları ekle
      res.set({
        'X-RateLimit-Limit': String(limiter.points),
        'X-RateLimit-Remaining': String(result.remainingPoints),
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      });

      next();
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        const retryAfter = Math.ceil(err.msBeforeNext / 1000);

        logger.warn('Rate limit exceeded', {
          ip: clientIp,
          path: req.path,
          retryAfter,
        });

        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Çok fazla istek gönderdiniz. Lütfen bekleyin.',
            retryAfter,
          },
        });
      } else {
        // Redis hatası — limit bypass et, loglayıp devam et
        logger.error('Rate limiter Redis error:', err);
        next();
      }
    }
  };
}

// ─── Export Middlewares ────────────────────────────────────────────────────

export const globalRateLimit = createRateLimitMiddleware(globalLimiter);
export const authRateLimit = createRateLimitMiddleware(authLimiter);
export const issueCreateRateLimit = createRateLimitMiddleware(issueCreateLimiter);
export const nviRateLimit = createRateLimitMiddleware(nviLimiter);
export const chatbotRateLimit = createRateLimitMiddleware(chatbotLimiter);
