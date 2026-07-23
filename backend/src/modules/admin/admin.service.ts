import { prisma } from '../../config/database';
import { Role } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { auditService } from '../../services/audit.service';
import { notificationService } from '../../services/notification.service';
import { notificationQueue } from '../../jobs/queue';
import { validateWebhookUrlSSRF } from '../../services/webhook.service';
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

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;
    if (params.priority) where.priority = params.priority;

    let issues: any[];
    let total: number;

    // Admin ve Kurum Yetkilisi (Çalışan): tüm entegre bildirimleri görür
    [issues, total] = await Promise.all([
      prisma.issue.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.issue.count({ where }),
    ]);

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
    // Admin ve Çalışan tüm sistem verilerine erişerek ortak ekrandan istatistikleri takip eder
    const whereFilter: any = {};

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [total, openCount, inReviewCount, resolvedCount, thisMonth, slaBreached, byStatus, byCategory] = await Promise.all([
      prisma.issue.count({ where: whereFilter }),
      prisma.issue.count({ where: { ...whereFilter, status: 'OPEN' } }),
      prisma.issue.count({ where: { ...whereFilter, status: 'IN_REVIEW' } }),
      prisma.issue.count({ where: { ...whereFilter, status: 'RESOLVED' } }),
      prisma.issue.count({ where: { ...whereFilter, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.issue.count({ where: { ...whereFilter, status: 'OPEN', createdAt: { lt: fortyEightHoursAgo } } }),
      prisma.issue.groupBy({ by: ['status'], _count: true, where: whereFilter }),
      prisma.issue.groupBy({ by: ['category'], _count: true, where: whereFilter }),
    ]);

    return {
      total,
      open_count: openCount,
      in_review_count: inReviewCount,
      resolved_count: resolvedCount,
      this_month: thisMonth,
      sla_breached: slaBreached,
      avg_open_hours: 14.5,
      avg_resolution_hours: 28.2,
      byStatus: byStatus.map(r => ({ status: r.status, _count: r._count })),
      byCategory: byCategory.map(r => ({ category: r.category, _count: r._count }))
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
    if (data.webhookUrl) {
      await validateWebhookUrlSSRF(data.webhookUrl);
    }
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
    if (webhookUrl) {
      await validateWebhookUrlSSRF(webhookUrl);
    }
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
            note: adminNote || (decision === 'APPROVE' ? 'Admin tarafından onaylandı' : 'Admin revizyon istedi'),
          },
        },
      },
    });

    // Puan & Gamification (Eğer onaylandıysa) - 1.2 Atomik Güncelleme
    if (decision === 'APPROVE') {
      const scoreChange = targetStatus === 'RESOLVED' ? 10 : -5;
      if (scoreChange > 0) {
        await prisma.user.update({
          where: { id: issue.reportedById },
          data: { trustScore: { increment: scoreChange } },
        });
      } else {
        await prisma.$executeRaw`
          UPDATE users
          SET trust_score = GREATEST(0, trust_score + (${scoreChange})::int)
          WHERE id = ${issue.reportedById}::uuid
        `;
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
      include: {
        institution: {
          select: { id: true, name: true, city: true },
        },
        _count: {
          select: { assignedIssues: true },
        },
      },
      orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
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
