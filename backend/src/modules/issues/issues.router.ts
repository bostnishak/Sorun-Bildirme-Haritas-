import { Router } from 'express';
import * as issuesController from './issues.controller';
import { isAuthenticated, optionalAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/auth.middleware';
import { issueCreateRateLimit, chatbotRateLimit, guestChatbotRateLimit } from '../../middleware/rateLimiter.middleware';

const dynamicChatbotRateLimit = (req: any, res: any, next: any) => {
  if (!req.user) {
    return guestChatbotRateLimit(req, res, next);
  }
  return chatbotRateLimit(req, res, next);
};

const router = Router();

// GET /api/v1/issues/map-cluster — Public (harita verisi)
router.get('/map-cluster', issuesController.getClusteredIssues);

// GET /api/v1/issues — Public (tablo görünümü)
router.get('/', issuesController.listIssues);

// GET /api/v1/issues/summary-stats — Public (özet istatistikler)
router.get('/summary-stats', issuesController.getSummaryStats);

// GET /api/v1/issues/my/list — Oturum açmış kullanıcının bildirimleri
router.get('/my/list', isAuthenticated, issuesController.getMyIssues);

// GET /api/v1/issues/geocode/forward — İleri Yönde Adresten Koordinat Çözümleme
router.get('/geocode/forward', issuesController.forwardGeocodeAddress);

// GET /api/v1/issues/geocode — Yüksek hassasiyetli adres ayrıştırma
router.get('/geocode', issuesController.reverseGeocodeAddress);

// POST /api/v1/issues/verify-vision — Bilgisayarlı görü ile kanıt analizi
router.post('/verify-vision', isAuthenticated, issuesController.verifyPhotoProof);

// POST /api/v1/issues/ai-assistant — Tek istemli AI ihbar asistanı
router.post('/ai-assistant', optionalAuth, dynamicChatbotRateLimit, issuesController.assistantSinglePrompt);

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

// DELETE /api/v1/issues/:id/upvote — Oyu geri çek
router.delete(
  '/:id/upvote',
  isAuthenticated,
  issuesController.removeUpvote,
);

// GET /api/v1/issues/:id/comments — Yorum listesi (Public veya Authenticated, şimdilik public yapabiliriz ama genelde public'tir. Plan'da isAuthenticated istenmemiş ama biz ekleyebiliriz veya çıkartabiliriz. endpoint tanımına göre yapalım.)
router.get(
  '/:id/comments',
  issuesController.getComments,
);

// POST /api/v1/issues/:id/comments — Yorum veya resmi açıklama ekle
router.post(
  '/:id/comments',
  isAuthenticated,
  issuesController.addComment,
);

// DELETE /api/v1/issues/:id/comments/:commentId — Yorum sil (Admin + kendi yorumu)
router.delete(
  '/:id/comments/:commentId',
  isAuthenticated,
  issuesController.deleteComment,
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
