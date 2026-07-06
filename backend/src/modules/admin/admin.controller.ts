import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';

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
