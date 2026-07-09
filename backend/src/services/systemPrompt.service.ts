import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export class SystemPromptService {
  /**
   * Fetches the active system prompt for a given key.
   * Caches the result in Redis for 1 hour.
   * Fallbacks to the default text if DB is unreachable or prompt doesn't exist.
   */
  static async getPrompt(key: string, defaultPrompt: string): Promise<string> {
    const cacheKey = `system_prompt:${key}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (err) {
      logger.warn(`Redis cache error for system prompt ${key}`, { error: String(err) });
    }

    try {
      const activePrompt = await prisma.systemPrompt.findFirst({
        where: { key, isActive: true },
        orderBy: { version: 'desc' },
      });

      if (activePrompt) {
        try {
          await redis.setex(cacheKey, 3600, activePrompt.content); // 1 hour
        } catch (err) {
           logger.warn(`Redis set error for system prompt ${key}`, { error: String(err) });
        }
        return activePrompt.content;
      }
    } catch (err) {
      logger.error(`Database error fetching system prompt ${key}`, { error: String(err) });
    }

    // Fallback to default
    return defaultPrompt;
  }
}
