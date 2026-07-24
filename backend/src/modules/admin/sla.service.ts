import { prisma } from '../../config/database';

export const slaService = {
  /**
   * Kuruma özel SLA genel raporu (belirli bir tarih aralığı için)
   */
  async getSLAReport(institutionId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Varsayılan: Son 30 gün

    const result = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int AS total_issues,
        COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open_issues,
        COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved_issues,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL) AS avg_resolution_hours,
        COUNT(*) FILTER (WHERE status = 'OPEN' AND created_at < NOW() - INTERVAL '48 hours')::int AS current_sla_breaches
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE (inst.boundary IS NULL OR ST_Within(i.location, inst.boundary))
        AND i.created_at >= ${start}
        AND i.created_at <= ${end}
    `;

    return result[0];
  },

  /**
   * 48 saatten fazla süredir açık kalan (SLA ihlali yapan) sorunları getir
   */
  async getSLABreaches(institutionId: string) {
    const breaches = await prisma.$queryRaw<any[]>`
      SELECT i.id, i.title, i.category, i.priority, i.created_at, 
             EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 AS open_hours
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE (inst.boundary IS NULL OR ST_Within(i.location, inst.boundary))
        AND i.status = 'OPEN'
        AND i.created_at < NOW() - INTERVAL '48 hours'
      ORDER BY i.created_at ASC
    `;

    return breaches;
  },

  /**
   * Son N günlük çözüm trendi (gün bazında çözülen sorun sayısı ve ortalama çözüm süresi)
   */
  async getResolutionTrend(institutionId: string, days: number = 7) {
    const trend = await prisma.$queryRaw<any[]>`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - (${days} - 1) * INTERVAL '1 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date
      )
      SELECT 
        TO_CHAR(ds.date, 'YYYY-MM-DD') as resolve_date,
        COUNT(i.id)::int as resolved_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600), 0) as avg_resolution_hours
      FROM date_series ds
      LEFT JOIN institutions inst ON inst.id = ${institutionId}::uuid
      LEFT JOIN issues i ON DATE(i.resolved_at) = ds.date
                         AND i.status = 'RESOLVED'
                         AND (inst.boundary IS NULL OR ST_Within(i.location, inst.boundary))
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `;

    return trend;
  }
};
