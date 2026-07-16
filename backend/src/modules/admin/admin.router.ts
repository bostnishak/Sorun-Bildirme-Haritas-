import { Router } from 'express';
import * as adminController from './admin.controller';
import * as dlqController from './dlq.controller';
import * as heatmapController from './heatmap.controller';
import * as criticalController from './critical.controller';
import { isAuthenticated, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Tüm admin endpoint'leri authenticated gerektirir
router.use(isAuthenticated);

// GET /api/v1/admin/portal/issues — Kurum portalı sorun listesi
router.get(
  '/portal/issues',
  requireRole('INSTITUTION_OFFICER', 'SUPER_ADMIN'),
  adminController.getPortalIssues,
);

// GET /api/v1/admin/stats — İstatistikler
router.get(
  '/stats',
  requireRole('INSTITUTION_OFFICER', 'SUPER_ADMIN'),
  adminController.getStats,
);

// GET /api/v1/admin/institutions — Kurum listesi (sadece admin)
router.get(
  '/institutions',
  requireRole('SUPER_ADMIN'),
  adminController.getInstitutions,
);

// POST /api/v1/admin/institutions — Yeni kurum
router.post(
  '/institutions',
  requireRole('SUPER_ADMIN'),
  adminController.createInstitution,
);

// PATCH /api/v1/admin/institutions/:id/webhook — Kurum webhook ayarı
router.patch(
  '/institutions/:id/webhook',
  requireRole('SUPER_ADMIN'),
  adminController.updateInstitutionWebhook,
);

// POST /api/v1/admin/institutions/:id/webhook/test — Test webhook bildirimi
router.post(
  '/institutions/:id/webhook/test',
  requireRole('SUPER_ADMIN'),
  adminController.testInstitutionWebhook,
);

// GET /api/v1/admin/ai-logs — AI Moderation logs
router.get(
  '/ai-logs',
  requireRole('SUPER_ADMIN'),
  adminController.getAiLogs,
);

// GET /api/v1/admin/sla/report
router.get(
  '/sla/report',
  requireRole('INSTITUTION_OFFICER', 'SUPER_ADMIN'),
  adminController.getSLAReport,
);

// GET /api/v1/admin/sla/breaches
router.get(
  '/sla/breaches',
  requireRole('INSTITUTION_OFFICER', 'SUPER_ADMIN'),
  adminController.getSLABreaches,
);

// GET /api/v1/admin/sla/trend
router.get(
  '/sla/trend',
  requireRole('INSTITUTION_OFFICER', 'SUPER_ADMIN'),
  adminController.getResolutionTrend,
);

// GET /api/v1/admin/webhook-dlq
router.get(
  '/webhook-dlq',
  requireRole('SUPER_ADMIN'),
  dlqController.getWebhookDLQ,
);

// POST /api/v1/admin/webhook-dlq/:jobId/retry
router.post(
  '/webhook-dlq/:jobId/retry',
  requireRole('SUPER_ADMIN'),
  dlqController.retryWebhookDLQJob,
);

// GET /api/v1/admin/heatmap
router.get(
  '/heatmap',
  requireRole('SUPER_ADMIN', 'INSTITUTION_OFFICER'),
  heatmapController.getHeatmap,
);

// GET /api/v1/admin/critical-issues
router.get(
  '/critical-issues',
  requireRole('SUPER_ADMIN', 'INSTITUTION_OFFICER'),
  criticalController.getCriticalIssues,
);

export { router as adminRouter };
