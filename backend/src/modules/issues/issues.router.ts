import { Router } from 'express';
import * as issuesController from './issues.controller';
import { isAuthenticated } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/auth.middleware';
import { issueCreateRateLimit } from '../../middleware/rateLimiter.middleware';

const router = Router();

// GET /api/v1/issues/map-cluster — Public (harita verisi)
router.get('/map-cluster', issuesController.getClusteredIssues);

// GET /api/v1/issues — Public (tablo görünümü)
router.get('/', issuesController.listIssues);

// GET /api/v1/issues/summary-stats — Public (özet istatistikler)
router.get('/summary-stats', issuesController.getSummaryStats);

// GET /api/v1/issues/my/list — Oturum açmış kullanıcının bildirimleri
router.get('/my/list', isAuthenticated, issuesController.getMyIssues);

// GET /api/v1/issues/geocode — Yüksek hassasiyetli adres ayrıştırma
router.get('/geocode', issuesController.reverseGeocodeAddress);

// POST /api/v1/issues/verify-vision — Bilgisayarlı görü ile kanıt analizi
router.post('/verify-vision', isAuthenticated, issuesController.verifyPhotoProof);

// POST /api/v1/issues/ai-assistant — Tek istemli AI ihbar asistanı
router.post('/ai-assistant', isAuthenticated, issuesController.assistantSinglePrompt);

// GET /api/v1/issues/:id — Public (sorun detayı)
router.get('/:id', issuesController.getIssue);

// POST /api/v1/issues — Sadece kayıtlı vatandaşlar
router.post(
  '/',
  isAuthenticated,
  issueCreateRateLimit,
  issuesController.createIssue,
);

// POST /api/v1/issues/:id/upvote — Oturum açmış herkes
router.post(
  '/:id/upvote',
  isAuthenticated,
  issuesController.upvoteIssue,
);

// POST /api/v1/issues/:id/comments — Yorum veya resmi açıklama ekle
router.post(
  '/:id/comments',
  isAuthenticated,
  issuesController.addComment,
);

// PATCH /api/v1/issues/:id/status — Sadece kurum yetkilisi ve admin
router.patch(
  '/:id/status',
  isAuthenticated,
  requireRole('INSTITUTION_OFFICER', 'SUPER_ADMIN'),
  issuesController.updateIssueStatus,
);

// DELETE /api/v1/issues/:id — Sadece admin
router.delete(
  '/:id',
  isAuthenticated,
  requireRole('SUPER_ADMIN'),
  issuesController.deleteIssue,
);

export { router as issuesRouter };
