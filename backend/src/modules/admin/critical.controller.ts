import { Request, Response } from 'express';
import { prisma } from '../../config/database';

/**
 * GET /api/v1/admin/critical-issues
 * Açık olan kritik sorunları oy sayısına ve oluşturulma zamanına göre önceliklendirerek listeler
 */
export async function getCriticalIssues(req: Request, res: Response): Promise<void> {
  const { institutionId } = req.user;

  // Kurum yetkilisi ise sadece kendi poligonu içindeki kritik sorunlar
  let issues;

  if (institutionId) {
    issues = await prisma.$queryRaw<any[]>`
      SELECT i.id, i.title, i.category, i.priority, i.status, 
             i.created_at, i.upvote_count, i.latitude, i.longitude, i.city, i.district
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE (inst.boundary IS NULL OR ST_Within(i.location, inst.boundary))
        AND i.priority = 'CRITICAL'
        AND i.status = 'OPEN'
      ORDER BY i.upvote_count DESC, i.created_at ASC
      LIMIT 10
    `;
  } else {
    // Super admin tüm kritik sorunları görür
    issues = await prisma.issue.findMany({
      where: {
        priority: 'CRITICAL',
        status: 'OPEN',
      },
      orderBy: [
        { upvoteCount: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 10,
      select: {
        id: true, title: true, category: true, priority: true, status: true,
        createdAt: true, upvoteCount: true, latitude: true, longitude: true,
        city: true, district: true,
      }
    });
  }

  res.status(200).json({ success: true, data: issues });
}
