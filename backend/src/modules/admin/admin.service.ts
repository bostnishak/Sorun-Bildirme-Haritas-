import { prisma } from '../../config/database';
import { Role } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { auditService } from '../../services/audit.service';
import { notificationService } from '../../services/notification.service';
import { notificationQueue } from '../../jobs/queue';
import { logger } from '../../utils/logger';

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

    // Kurum yetkilisi — kendi bölgesi temel istatistikler
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

    // Kategoriye Göre Dağılım (Pie Chart İçin)
    const byCategoryRaw = await prisma.$queryRaw<any[]>`
      SELECT i.category, COUNT(*)::int as _count
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE ST_Within(i.location, inst.boundary)
      GROUP BY i.category
    `;

    // Duruma Göre Dağılım (Bar Chart İçin)
    const byStatusRaw = await prisma.$queryRaw<any[]>`
      SELECT i.status, COUNT(*)::int as _count
      FROM issues i
      JOIN institutions inst ON inst.id = ${institutionId}::uuid
      WHERE ST_Within(i.location, inst.boundary)
      GROUP BY i.status
    `;

    // Format the response to match the SUPER_ADMIN structure for frontend compatibility
    return {
      ...stats[0],
      byCategory: byCategoryRaw.map(r => ({ category: r.category, _count: r._count })),
      byStatus: byStatusRaw.map(r => ({ status: r.status, _count: r._count }))
    };
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

  // ─── Çözüm Onay Merkezi (Approval Hub) ────────────────────────────────────
  async getApprovals() {
    const issues = await prisma.issue.findMany({
      where: {
        status: {
          in: ['RESOLVED_PENDING_APPROVAL', 'REJECTED_PENDING_APPROVAL'],
        },
      },
      include: {
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedOfficer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return issues;
  },

  async decideApproval(
    issueId: string,
    decision: 'APPROVE' | 'REQUEST_REVISION',
    adminId: string,
    adminNote?: string,
  ) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { reportedBy: true, assignedOfficer: true },
    });
    if (!issue) throw new NotFoundError('Sorun');

    if (
      issue.status !== 'RESOLVED_PENDING_APPROVAL' &&
      issue.status !== 'REJECTED_PENDING_APPROVAL'
    ) {
      throw new BadRequestError('Bu sorun onaya sunulmamış veya zaten karara bağlanmış.');
    }

    const previousStatus = issue.status;
    let targetStatus: any = 'IN_REVIEW';

    if (decision === 'APPROVE') {
      targetStatus =
        previousStatus === 'RESOLVED_PENDING_APPROVAL' ? 'RESOLVED' : 'REJECTED';
    } else {
      targetStatus = 'IN_REVIEW';
    }

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        status: targetStatus,
        resolvedAt: targetStatus === 'RESOLVED' ? new Date() : issue.resolvedAt,
        adminReviewNote: adminNote || (decision === 'APPROVE' ? 'Onaylandı' : 'Revizyon İstendi'),
        statusHistory: {
          create: {
            fromStatus: previousStatus,
            toStatus: targetStatus,
            changedBy: adminId,
            note: adminNote || (decision === 'APPROVE' ? 'Süper Yönetici tarafından onaylandı' : 'Süper Yönetici revizyon istedi'),
          },
        },
      },
    });

    // Puan & Gamification (Eğer onaylandıysa)
    if (decision === 'APPROVE') {
      const scoreChange = targetStatus === 'RESOLVED' ? 10 : -5;
      const user = await prisma.user.findUnique({
        where: { id: issue.reportedById },
        select: { trustScore: true },
      });
      if (user) {
        const newScore = Math.max(0, user.trustScore + scoreChange);
        await prisma.user.update({
          where: { id: issue.reportedById },
          data: { trustScore: newScore },
        });
      }
    }

    // Bildirimler
    if (decision === 'APPROVE' && issue.reportedById) {
      await notificationService.createNotification({
        userId: issue.reportedById,
        title: 'Başvurunuz Resmi Olarak Karara Bağlandı',
        message: `"${issue.title}" başlıklı sorununuz "${targetStatus === 'RESOLVED' ? 'Çözüldü' : 'Reddedildi'}" olarak onaylanmıştır.`,
        type: 'ISSUE_STATUS_CHANGED',
        link: `/issues/${issueId}`,
      });

      if (issue.reportedBy?.email) {
        await notificationQueue.add('send-email', {
          email: issue.reportedBy.email,
          subject: `Başvurunuz Sonuçlandı: ${issue.title}`,
          text: `Sayın ${issue.reportedBy.firstName || 'Vatandaş'},\n\n"${issue.title}" başlıklı sorununuz "${targetStatus === 'RESOLVED' ? 'Çözüldü' : 'Reddedildi'}" olarak resmi onay almıştır.\n\nEtiya Project Ekibi`,
        });
      }
    } else if (decision === 'REQUEST_REVISION' && issue.assignedOfficerId) {
      await notificationService.createNotification({
        userId: issue.assignedOfficerId,
        title: '⚠️ Çözüm Revizyonu İstendi',
        message: `"${issue.title}" için gönderdiğiniz çözüm admin tarafından revizyona iade edildi. Not: ${adminNote || '-'}`,
        type: 'ISSUE_STATUS_CHANGED',
        link: `/issues/${issueId}`,
      });
    }

    await auditService.logAction(adminId, 'ADMIN_APPROVAL_DECISION', issueId, 'Issue', {
      decision,
      from: previousStatus,
      to: targetStatus,
      adminNote,
    });

    return updated;
  },

  // ─── Personel ve Çalışan Yönetimi (Personnel Management) ──────────────────
  async getPersonnel() {
    const personnel = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.INSTITUTION_OFFICER, Role.SUPER_ADMIN],
        },
      },
      include: {
        institution: {
          select: { id: true, name: true, city: true },
        },
        _count: {
          select: { assignedIssues: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return personnel;
  },

  async searchUsers(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const q = query.trim();
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        institutionId: true,
        institution: { select: { id: true, name: true } },
      },
      take: 20,
    });
    return users;
  },

  async updateUserRole(targetUserId: string, newRole: Role, institutionId?: string | null) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundError('Kullanıcı');

    if (newRole === Role.INSTITUTION_OFFICER && !institutionId) {
      throw new BadRequestError('Kurum çalışanı rolü için bir kurum (institutionId) atamanız zorunludur.');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: newRole,
        institutionId: newRole === Role.INSTITUTION_OFFICER && institutionId ? institutionId : null,
      },
      include: {
        institution: { select: { id: true, name: true, city: true } },
      },
    });

    logger.info('Kullanıcı rolü güncellendi', { targetUserId, newRole, institutionId });
    return updated;
  },
};
