import { Router } from 'express';
import * as adminController from './admin.controller';
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

export { router as adminRouter };
