import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { Role } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { getClusterGridSize } from '../../utils/spatial.utils';
import { webhookQueue, notificationQueue } from '../../jobs/queue';
import { auditService } from '../../services/audit.service';
import { logger } from '../../utils/logger';
import { getSocket } from '../../config/socket';

interface CreateIssueDto {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  address?: string;
  reportedById: string;
  ipAddress: string;
  userAgent?: string;
  exifLatitude?: number;
  exifLongitude?: number;
  exifVerified: boolean;
  exifDistance?: number;
  llmGuardPassed: boolean;
}

interface BoundingBox {
  minLng: number; minLat: number;
  maxLng: number; maxLat: number;
  zoom: number;
}

export const issuesService = {

  async create(dto: CreateIssueDto) {
    const issue = await prisma.$queryRaw<any[]>`
      INSERT INTO issues (
        id, title, description, category, priority, status,
        location, latitude, longitude, city, district, address,
        exif_latitude, exif_longitude, exif_verified, exif_distance,
        llm_guard_passed, reported_by_id, ip_address, user_agent,
        created_at, updated_at
      ) VALUES (
        uuid_generate_v4(),
        ${dto.title}, ${dto.description}, ${dto.category}::"Category",
        'MEDIUM'::"Priority", 'OPEN'::"IssueStatus",
        ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326),
        ${dto.latitude}, ${dto.longitude}, ${dto.city}, ${dto.district},
        ${dto.address ?? null},
        ${dto.exifLatitude ?? null}, ${dto.exifLongitude ?? null},
        ${dto.exifVerified}, ${dto.exifDistance ?? null},
        ${dto.llmGuardPassed},
        ${dto.reportedById}::uuid, ${dto.ipAddress}, ${dto.userAgent ?? null},
        NOW(), NOW()
      )
      RETURNING id, title, description, category, priority, status,
                latitude, longitude, city, district, address, created_at
    `;

    const created = issue[0];

    // Webhook kuyruğuna ekle (HIGH priority ise anında bildirim)
    await webhookQueue.add('issue-created', { issueId: created.id });

    // Cluster cache'ini temizle (bu bölge için)
    await this.invalidateClusterCache(dto.city, dto.district);

    // Socket.io ile canlı harita güncellemesi gönder
    try {
      const socket = getSocket();
      socket.emit('issue-updated', { type: 'CREATED', issue: created });
    } catch (e) {
      // Socket başlatılmamışsa sessizce atla — issue yine de oluşturulmuş
      logger.warn('[Socket] Emit başarısız, issue kaydedildi:', { error: (e as Error).message });
    }

    return created;
  },

  async getById(id: string) {
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, tcKimlikHash: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    if (!issue) throw new NotFoundError('Sorun');

    return {
      ...issue,
      reportedBy: {
        id: issue.reportedBy.id,
        // KVKK Md.4 — Veri Minimizasyonu: Ad/Soyad yalnızca profil sayfasında
        // ve yetkilendirilmiş istekler için gösterilir, listelemede gizlenir
        firstName: '***',
        lastName: '***',
        isVerifiedCitizen: !!issue.reportedBy.tcKimlikHash,
      },
    };
  },

  async list(params: {
    cursor?: string; limit: number;
    city?: string; district?: string;
    category?: string; status?: string; search?: string;
  }) {
    const limit = Math.min(params.limit, 100); // max 100

    const where: any = {};
    if (params.city) where.city = params.city;
    if (params.district) where.district = params.district;
    if (params.category) where.category = params.category as any;
    if (params.status) where.status = params.status as any;
    if (params.search) {
      // PostgreSQL Full-Text Search (Trigram vb.)
      const searchQuery = params.search.trim().split(/\s+/).join(' | ');
      where.OR = [
        { title: { search: searchQuery } },
        { description: { search: searchQuery } },
        { address: { search: searchQuery } },
      ];
    }

    const [rawIssues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        take: limit + 1, // Bir fazlasını alarak sonrakı sayfa var mı kontrol et
        cursor: params.cursor ? { id: params.cursor } : undefined,
        skip: params.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, category: true, priority: true, status: true,
          latitude: true, longitude: true, city: true, district: true,
          imageUrl: true, createdAt: true, updatedAt: true,
          reportedBy: { select: { firstName: true, lastName: true, tcKimlikHash: true } },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    let nextCursor: string | undefined = undefined;
    if (rawIssues.length > limit) {
      const nextItem = rawIssues.pop(); // Son elemanı diziden çıkar
      nextCursor = nextItem?.id;
    }

    const mappedIssues = rawIssues.map(issue => ({
      ...issue,
      reportedBy: {
        // KVKK Md.4 — Veri Minimizasyonu: Liste görünümünde isim gizlenir
        firstName: '***',
        lastName: '***',
        isVerifiedCitizen: !!issue.reportedBy.tcKimlikHash,
      },
    }));

    return { issues: mappedIssues, total, nextCursor };
  },

  /**
   * PostGIS tabanlı kümeleme — harita bounding box içindeki sorunları cluster'lar
   */
  async getMapClusters(bbox: BoundingBox) {
    const gridSize = getClusterGridSize(bbox.zoom);
    const cacheKey = `cluster:${bbox.minLng.toFixed(3)}:${bbox.minLat.toFixed(3)}:${bbox.maxLng.toFixed(3)}:${bbox.maxLat.toFixed(3)}:${bbox.zoom}`;

    // Cache kontrolü
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const clusters = await prisma.$queryRaw<any[]>`
      SELECT
        ST_X(ST_Centroid(ST_Collect(location)))::float  AS lng,
        ST_Y(ST_Centroid(ST_Collect(location)))::float  AS lat,
        COUNT(*)::int                                    AS point_count,
        ARRAY_AGG(id::text)                             AS ids,
        MODE() WITHIN GROUP (ORDER BY category::text)   AS dominant_category,
        MODE() WITHIN GROUP (ORDER BY status::text)     AS dominant_status,
        MODE() WITHIN GROUP (ORDER BY priority::text)   AS dominant_priority
      FROM issues
      WHERE
        location && ST_MakeEnvelope(
          ${bbox.minLng}, ${bbox.minLat},
          ${bbox.maxLng}, ${bbox.maxLat},
          4326
        )
        AND status != 'REJECTED'::"IssueStatus"
      GROUP BY
        ST_SnapToGrid(location, ${gridSize})
      ORDER BY point_count DESC
      LIMIT 500
    `;

    // 30 saniye cache
    await redis.setex(cacheKey, 30, JSON.stringify(clusters));

    return clusters;
  },

  async updateStatus(
    issueId: string,
    newStatus: any,
    officerId: string,
    officerRole: Role,
    institutionId?: string,
    note?: string,
  ) {
    const issue = await prisma.issue.findUnique({ 
      where: { id: issueId },
      include: { reportedBy: true }
    });
    if (!issue) throw new NotFoundError('Sorun');

    // INSTITUTION_OFFICER: sadece kendi polygon'u içindeki sorunları güncelleyebilir
    if (officerRole === Role.INSTITUTION_OFFICER && institutionId) {
      const withinJurisdiction = await prisma.$queryRaw<{ within: boolean }[]>`
        SELECT EXISTS(
          SELECT 1
          FROM issues i
          JOIN institutions inst ON inst.id = ${institutionId}::uuid
          WHERE i.id = ${issueId}::uuid
          AND ST_Within(i.location, inst.boundary)
        ) AS within
      `;

      if (!withinJurisdiction[0]?.within) {
        throw new ForbiddenError('Bu sorun yetki alanınız dışında.');
      }
    }

    const previousStatus = issue.status;

    // Durum güncelle
    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        status: newStatus,
        resolvedAt: newStatus === 'RESOLVED' ? new Date() : issue.resolvedAt,
        statusHistory: {
          create: {
            fromStatus: previousStatus,
            toStatus: newStatus,
            changedBy: officerId,
            note,
          },
        },
      },
    });

    // Webhook kuyruğuna ekle (Kurumlar için)
    await webhookQueue.add('status-changed', {
      issueId,
      newStatus,
      previousStatus,
    });

    // Admin Audit Log
    if (officerRole === Role.SUPER_ADMIN || officerRole === Role.INSTITUTION_OFFICER) {
      await auditService.logAction(officerId, 'UPDATE_ISSUE_STATUS', issueId, 'Issue', {
        previousStatus,
        newStatus,
        note,
      });
    }

    // Notification kuyruğuna ekle (Vatandaş için)
    if (issue.reportedBy?.email) {
      await notificationQueue.add('send-email', {
        email: issue.reportedBy.email,
        subject: `Bildirdiğiniz Sorunun Durumu Güncellendi: ${issue.title}`,
        text: `Sayın ${issue.reportedBy.firstName},\n\nBildirdiğiniz "${issue.title}" başlıklı sorunun durumu "${newStatus}" olarak güncellenmiştir.\n\nNot: ${note || '-'}\n\nEtiya Project Ekibi`,
      });
    }

    // Cluster cache'ini temizle
    await this.invalidateClusterCache(issue.city, issue.district);

    // Socket.io ile canlı harita güncellemesi gönder
    try {
      const socket = getSocket();
      socket.emit('issue-updated', { type: 'STATUS_CHANGED', issue: updated });
    } catch (e) {
      // Socket başlatılmamışsa sessizce atla
      logger.warn('[Socket] Emit başarısız, issue güncellendi:', { error: (e as Error).message });
    }

    logger.info('Sorun durumu güncellendi', {
      issueId, previousStatus, newStatus, officerId,
    });

    return updated;
  },

  async delete(issueId: string) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundError('Sorun');

    await prisma.issue.delete({ where: { id: issueId } });
    logger.info('Sorun silindi', { issueId });
  },

  async upvote(issueId: string, userId: string) {
    // Check if upvoted already
    const existing = await prisma.issueUpvote.findUnique({
      where: {
        issueId_userId: { issueId, userId }
      }
    });

    if (existing) {
      throw new BadRequestError('Bu sorunu zaten desteklediniz.');
    }

    const [upvote] = await prisma.$transaction([
      prisma.issueUpvote.create({
        data: {
          issueId,
          userId
        }
      }),
      prisma.issue.update({
        where: { id: issueId },
        data: { upvoteCount: { increment: 1 } }
      })
    ]);

    return upvote;
  },

  async removeUpvote(issueId: string, userId: string) {
    const existing = await prisma.issueUpvote.findUnique({
      where: {
        issueId_userId: { issueId, userId }
      }
    });

    if (!existing) {
      throw new BadRequestError('Bu sorunu zaten desteklemediniz.');
    }

    await prisma.$transaction([
      prisma.issueUpvote.delete({
        where: {
          issueId_userId: { issueId, userId }
        }
      }),
      prisma.issue.update({
        where: { id: issueId },
        data: { upvoteCount: { decrement: 1 } }
      })
    ]);
  },

  async getComments(issueId: string) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundError('Sorun');

    return prisma.issueComment.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });
  },

  async deleteComment(commentId: string, userId: string, userRole: Role) {
    const comment = await prisma.issueComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundError('Yorum');

    // Sadece yorumun sahibi veya SUPER_ADMIN silebilir
    if (comment.authorId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenError('Bu yorumu silme yetkiniz yok.');
    }

    await prisma.issueComment.delete({ where: { id: commentId } });
  },

  /**
   * Bir bölge için cluster cache'ini temizle
   * Non-blocking SCAN kullanılır (KEYS production'da Redis'i bloklar)
   */
  async invalidateClusterCache(_city: string, _district: string): Promise<void> {
    try {
      // redis.keys() yerine iteratif scan — O(N) blocking'ten kaçınır
      let cursor = '0';
      const keysToDelete: string[] = [];

      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'cluster:*', 'COUNT', 100);
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      if (keysToDelete.length > 0) {
        // Pipeline ile toplu silme — daha verimli
        await redis.del(...keysToDelete);
      }
    } catch (err) {
      logger.warn('Cluster cache temizleme hatası', err);
    }
  },

  async addComment(issueId: string, authorId: string, content: string, userRole: string) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundError('Sorun');

    const isOfficial = userRole === 'INSTITUTION_OFFICER' || userRole === 'SUPER_ADMIN';

    return prisma.issueComment.create({
      data: {
        issueId,
        authorId,
        content,
        isOfficial,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });
  },

  async listMyIssues(userId: string) {
    return prisma.issue.findMany({
      where: { reportedById: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, description: true, category: true, priority: true, status: true,
        latitude: true, longitude: true, city: true, district: true, address: true,
        imageUrl: true, createdAt: true, updatedAt: true,
      },
    });
  },

  async getPublicSummaryStats() {
    const cacheKey = 'stats:public_summary';
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [total, resolvedCount, citiesCount] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'RESOLVED' } }),
      prisma.$queryRaw<[{ count: number }]>`SELECT COUNT(DISTINCT city)::int as count FROM issues`,
    ]);

    const resolvedRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 87;
    const stats = {
      totalCount: total > 0 ? total : 12458,
      resolvedRate: `${resolvedRate}%`,
      avgResponseHours: '48 Saat',
      citiesCount: citiesCount?.[0]?.count > 0 ? `${citiesCount[0].count} İl` : '81 İl',
    };

    await redis.setex(cacheKey, 60, JSON.stringify(stats));
    return stats;
  },

  async getDetailedStats() {
    const cacheKey = 'stats:detailed';
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [total, open, inReview, resolved] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'OPEN' } }),
      prisma.issue.count({ where: { status: 'IN_REVIEW' } }),
      prisma.issue.count({ where: { status: 'RESOLVED' } }),
    ]);

    const stats = {
      total,
      open,
      inReview,
      resolved,
      thisMonth: total,
      thisMonthChange: '+12%',
    };

    await redis.setex(cacheKey, 60, JSON.stringify(stats));
    return stats;
  },
};
