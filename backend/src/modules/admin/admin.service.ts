import { prisma } from '../../config/database';
import { Role } from '@prisma/client';

export const adminService = {

  async getPortalIssues(
    userId: string,
    role: Role,
    institutionId: string | undefined,
    params: { page: number; limit: number; status?: string; category?: string; priority?: string },
  ) {
    const skip = (params.page - 1) * params.limit;
    const limit = Math.min(params.limit, 100);

    let issues: any[];
    let total: number;

    if (role === Role.SUPER_ADMIN) {
      // Admin: tüm sorunları görür
      const where: any = {};
      if (params.status) where.status = params.status;
      if (params.category) where.category = params.category;
      if (params.priority) where.priority = params.priority;

      [issues, total] = await Promise.all([
        prisma.issue.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.issue.count({ where }),
      ]);
    } else {
      // Kurum yetkilisi: sadece kendi polygon'u içindeki sorunları görür
      // GÜVENLİ: Prisma parametreli template literal — string interpolation kullanılmıyor
      const statusEnum = params.status ?? null;
      const categoryEnum = params.category ?? null;
      const priorityEnum = params.priority ?? null;

      const result = await prisma.$queryRaw<any[]>`
        SELECT i.*, COUNT(*) OVER() as total_count
        FROM issues i
        JOIN institutions inst ON inst.id = ${institutionId}::uuid
        WHERE ST_Within(i.location, inst.boundary)
          AND (${statusEnum}::text IS NULL OR i.status = ${statusEnum}::"IssueStatus")
          AND (${categoryEnum}::text IS NULL OR i.category = ${categoryEnum}::"Category")
          AND (${priorityEnum}::text IS NULL OR i.priority = ${priorityEnum}::"Priority")
        ORDER BY i.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

      issues = result;
      total = Number(result[0]?.total_count ?? 0);
    }

    return {
      data: issues,
      meta: {
        total,
        page: params.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getStats(role: Role, institutionId?: string) {
    if (role === Role.SUPER_ADMIN) {
      const [total, byStatus, byCategory] = await Promise.all([
        prisma.issue.count(),
        prisma.issue.groupBy({ by: ['status'], _count: true }),
        prisma.issue.groupBy({ by: ['category'], _count: true }),
      ]);
      return { total, byStatus, byCategory };
    }

    // Kurum yetkilisi — kendi bölgesi
    const stats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int                                       AS total,
        COUNT(*) FILTER (WHERE status = 'OPEN')::int        AS open_count,
        COUNT(*) FILTER (WHERE status = 'IN_REVIEW')::int   AS in_review_count,
        COUNT(*) FILTER (WHERE status = 'RESOLVED')::int    AS resolved_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS this_month,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) FILTER (WHERE status = 'OPEN') AS avg_open_hours,
        COUNT(*) FILTER (WHERE status = 'OPEN' AND created_at < NOW() - INTERVAL '48 hours')::int AS sla_breached,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL) AS avg_resolution_hours
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE ST_Within(i.location, inst.boundary)
    `;

    return stats[0];
  },

  async getInstitutions() {
    return prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, city: true, district: true,
        emailAddress: true, webhookUrl: true, isActive: true,
        _count: { select: { users: true } },
      },
      orderBy: [{ city: 'asc' }, { district: 'asc' }],
    });
  },

  async createInstitution(data: {
    name: string; city: string; district: string;
    emailAddress: string; webhookUrl?: string;
  }) {
    return prisma.institution.create({
      data: {
        name: data.name,
        city: data.city,
        district: data.district,
        emailAddress: data.emailAddress,
        webhookUrl: data.webhookUrl,
      },
    });
  },

  async updateInstitutionWebhook(id: string, webhookUrl: string | null, emailAddress?: string) {
    return prisma.institution.update({
      where: { id },
      data: {
        webhookUrl,
        ...(emailAddress ? { emailAddress } : {}),
      },
      select: {
        id: true, name: true, city: true, district: true,
        emailAddress: true, webhookUrl: true, isActive: true,
      },
    });
  },

  async testInstitutionWebhook(id: string) {
    const institution = await prisma.institution.findUnique({ where: { id } });
    if (!institution || !institution.webhookUrl) {
      throw new Error('Kurum için tanımlı bir webhook URL bulunamadı.');
    }

    const testPayload = {
      event: 'etiya-project.webhook.test',
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        institutionId: institution.id,
        institutionName: institution.name,
        message: 'Bu bir Etiya Project 153 Beyaz Masa Entegrasyon test bildirimidir.',
      },
    };

    const { dispatchWebhook } = await import('../../services/webhook.service');
    await dispatchWebhook(institution.webhookUrl, testPayload);
    return { success: true, testedUrl: institution.webhookUrl };
  },

  async getAiLogs(params: { page: number; limit: number; layer?: string; passed?: boolean; issueId?: string }) {
    const skip = (params.page - 1) * params.limit;
    const limit = Math.min(params.limit, 100);

    const where: any = {};
    if (params.layer) where.layer = params.layer;
    if (params.passed !== undefined) where.passed = params.passed;
    if (params.issueId) where.issueId = params.issueId;

    const [logs, total] = await Promise.all([
      prisma.aiModerationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aiModerationLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: params.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
