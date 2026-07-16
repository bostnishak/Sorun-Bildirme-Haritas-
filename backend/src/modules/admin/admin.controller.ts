import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { slaService } from './sla.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';
import { prisma } from '../../config/database';

const portalIssuesSchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
});

const createInstitutionSchema = z.object({
  name: z.string().min(2).max(255),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  emailAddress: z.string().email(),
  webhookUrl: z.string().url().optional(),
});

/**
 * GET /api/v1/admin/portal/issues
 * Kurum yetkilisi: kendi polygon'u içindeki sorunları görür
 * Admin: tüm sorunları görür
 */
export async function getPortalIssues(req: Request, res: Response): Promise<void> {
  const parsed = portalIssuesSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz filtre parametreleri.');
  }

  const result = await adminService.getPortalIssues(
    req.user.sub,
    req.user.role,
    req.user.institutionId,
    parsed.data,
  );

  res.status(200).json({ success: true, ...result });
}

/**
 * GET /api/v1/admin/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  const stats = await adminService.getStats(
    req.user.role,
    req.user.institutionId,
  );
  res.status(200).json({ success: true, data: stats });
}

/**
 * GET /api/v1/admin/institutions
 */
export async function getInstitutions(_req: Request, res: Response): Promise<void> {
  const institutions = await adminService.getInstitutions();
  res.status(200).json({ success: true, data: institutions });
}

/**
 * POST /api/v1/admin/institutions
 */
export async function createInstitution(req: Request, res: Response): Promise<void> {
  const parsed = createInstitutionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map(e => e.message).join(', '));
  }

  const institution = await adminService.createInstitution(parsed.data);
  res.status(201).json({ success: true, data: institution });
}

/**
 * PATCH /api/v1/admin/institutions/:id/webhook
 */
export async function updateInstitutionWebhook(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    webhookUrl: z.string().url('Geçerli bir URL olmalı').nullable(),
    emailAddress: z.string().email().optional(),
  });
  const { webhookUrl, emailAddress } = schema.parse(req.body);

  const updated = await adminService.updateInstitutionWebhook(req.params.id, webhookUrl, emailAddress);
  res.status(200).json({ success: true, message: 'Kurum entegrasyon ayarları güncellendi.', data: updated });
}

/**
 * POST /api/v1/admin/institutions/:id/webhook/test
 */
export async function testInstitutionWebhook(req: Request, res: Response): Promise<void> {
  const result = await adminService.testInstitutionWebhook(req.params.id);
  res.status(200).json({ success: true, message: 'Test webhook bildirimi başarıyla iletildi.', data: result });
}

/**
 * GET /api/v1/admin/ai-logs
 */
export async function getAiLogs(req: Request, res: Response): Promise<void> {
  const querySchema = z.object({
    page: z.string().default('1').transform(Number),
    limit: z.string().default('50').transform(Number),
    layer: z.string().optional(),
    passed: z.string().transform(val => val === 'true').optional(),
    issueId: z.string().uuid().optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz parametreler.');
  }

  const result = await adminService.getAiLogs(parsed.data);
  res.status(200).json({ success: true, ...result });
}

/**
 * Helper to resolve institutionId for SLA endpoints
 */
async function resolveInstitutionId(req: Request): Promise<string> {
  if (req.user.institutionId) {
    return req.user.institutionId;
  }
  if (req.query.institutionId && typeof req.query.institutionId === 'string') {
    return req.query.institutionId;
  }
  const firstInst = await prisma.institution.findFirst({ select: { id: true } });
  if (!firstInst) {
    throw new BadRequestError('Sistemde kayıtlı kurum bulunmuyor.');
  }
  return firstInst.id;
}

/**
 * GET /api/v1/admin/sla/report
 */
export async function getSLAReport(req: Request, res: Response): Promise<void> {
  const institutionId = await resolveInstitutionId(req);
  const report = await slaService.getSLAReport(institutionId);
  res.status(200).json({ success: true, data: report });
}

/**
 * GET /api/v1/admin/sla/breaches
 */
export async function getSLABreaches(req: Request, res: Response): Promise<void> {
  const institutionId = await resolveInstitutionId(req);
  const breaches = await slaService.getSLABreaches(institutionId);
  res.status(200).json({ success: true, data: breaches });
}

/**
 * GET /api/v1/admin/sla/trend
 */
export async function getResolutionTrend(req: Request, res: Response): Promise<void> {
  const institutionId = await resolveInstitutionId(req);
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const trend = await slaService.getResolutionTrend(institutionId, days);
  res.status(200).json({ success: true, data: trend });
}
