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
 * 5 istek / saat / IP (şifre deneme sınırı)
 */
export const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 5,
  duration: 3600,    // 1 saat
  blockDuration: 3600, // 1 saat block
});

/**
 * Strict Auth limiter: şifre sıfırlama ve hassas işlemler için (Email bomb koruması)
 * 5 istek / saat / IP
 */
export const strictAuthLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth_strict',
  points: 5,
  duration: 3600,
  blockDuration: 7200, // 2 saat block
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
 * Chatbot limiter: AI maliyet kontrolü (DDoS ve bütçe koruması)
 * 10 istek / saat / IP
 */
export const chatbotLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_chatbot',
  points: 10,
  duration: 3600, // 1 saat
  blockDuration: 3600, // 1 saat block
});

/**
 * Guest Chatbot limiter: strict AI cost control for non-logged in users
 * 5 istek / saat / IP
 */
export const guestChatbotLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_guest_chatbot',
  points: 5,
  duration: 3600, // 1 saat
  blockDuration: 3600, // 1 saat block
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
 * useUserId=true ise kullanıcı ID'si üzerinden, false ise IP üzerinden sınırlar
 */
export function createRateLimitMiddleware(limiter: RateLimiterRedis, useUserId = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // SORUN-74: Manuel 'x-forwarded-for' parse işlemi IP spoofing'e neden olur!
    // Express'teki "app.set('trust proxy', 1)" sayesinde 'req.ip' zaten en güvenilir proxy arkası IP'yi verir.
    const finalIp = req.ip || req.socket?.remoteAddress || 'unknown';

    const key = useUserId && (req as any).user?.sub
      ? `user_${(req as any).user.sub}`
      : finalIp;

    try {
      await limiter.consume(key);
      next();
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        const retryAfter = Math.ceil(err.msBeforeNext / 1000);
        logger.warn('Rate limit aşıldı', { key, retryAfter });
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Çok fazla istek gönderdiniz. Lütfen ${retryAfter} saniye bekleyin.`,
          },
        });
      } else {
        // Redis bağlantı hatası gibi beklenmeyen durumlarda geçir (fail-open)
        logger.error('Rate limiter iç hatası — geçiliyor', { error: String(err) });
        next();
      }
    }
  };
}

// ─── Export Middlewares ────────────────────────────────────────────────────

export const globalRateLimit = createRateLimitMiddleware(globalLimiter);
export const authRateLimit = createRateLimitMiddleware(authLimiter);
export const strictAuthRateLimit = createRateLimitMiddleware(strictAuthLimiter);
export const issueCreateRateLimit = createRateLimitMiddleware(issueCreateLimiter, true);
export const nviRateLimit = createRateLimitMiddleware(nviLimiter);
export const chatbotRateLimit = createRateLimitMiddleware(chatbotLimiter, true);
export const guestChatbotRateLimit = createRateLimitMiddleware(guestChatbotLimiter, false);
