import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';

const heatmapQuerySchema = z.object({
  city: z.string().min(2),
  category: z.string().optional(),
  days: z.string().default('30').transform(Number),
  limit: z.string().default('1000').transform(Number),
});

/**
 * GET /api/v1/admin/heatmap
 * Şehir, kategori ve zamana göre ısı haritası verisi döner
 */
export async function getHeatmap(req: Request, res: Response): Promise<void> {
  const parsed = heatmapQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz parametreler: city zorunludur.');
  }

  const { city, category, days, limit } = parsed.data;

  // Cache key (limit de eklendi)
  const cacheKey = `heatmap:${city}:${category || 'all'}:${days}:${limit}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    res.status(200).json({ success: true, data: JSON.parse(cached), cached: true });
    return;
  }

  const categoryEnum = category || null;
  // Güvenlik: Maksimum 10,000 sınır koyalım
  const safeLimit = Math.min(limit, 10000);

  // Prisma raw query
  // ST_SnapToGrid ile yakın noktaları kümeleyip sayısını (weight) buluyoruz
  const result = await prisma.$queryRaw<any[]>`
    SELECT
      ST_X(ST_SnapToGrid(location, 0.005))::float AS lng,
      ST_Y(ST_SnapToGrid(location, 0.005))::float AS lat,
      COUNT(*)::int AS weight,
      category
    FROM issues
    WHERE city = ${city}
      AND created_at >= NOW() - (${days} || ' days')::interval
      AND (${categoryEnum}::text IS NULL OR category = ${categoryEnum}::"Category")
    GROUP BY ST_SnapToGrid(location, 0.005), category
    ORDER BY weight DESC
    LIMIT ${safeLimit}
  `;

  // 5 dakika (300 saniye) cache
  await redis.setex(cacheKey, 300, JSON.stringify(result));

  res.status(200).json({ success: true, data: result, cached: false });
}
