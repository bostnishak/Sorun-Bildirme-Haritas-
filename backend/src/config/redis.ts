import IORedis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ requirement
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}, next retry in ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
});

redis.on('connect', () => logger.info('[OK] Redis connected'));
redis.on('error', (err) => logger.error('[ERROR] Redis error:', err));
redis.on('close', () => logger.warn('[WARN] Redis connection closed'));

export default redis;
