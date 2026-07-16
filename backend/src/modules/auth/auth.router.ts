import { Router } from 'express';
import * as authController from './auth.controller';
import { isAuthenticated } from '../../middleware/auth.middleware';
import { authRateLimit, nviRateLimit, strictAuthRateLimit } from '../../middleware/rateLimiter.middleware';

const router = Router();

// POST /api/v1/auth/register — Kayıt (TC kimlik opsiyonel; verilirse NVİ doğrulaması yapılır)
router.post('/register', authRateLimit, authController.register);

// POST /api/v1/auth/verify-identity — Sonradan TC Kimlik doğrulama (Doğrulanmış Vatandaş rozeti)
router.post('/verify-identity', isAuthenticated, nviRateLimit, authController.verifyIdentity);

// POST /api/v1/auth/login — Giriş
router.post('/login', authRateLimit, authController.login);

// POST /api/v1/auth/refresh — Access token yenile
router.post('/refresh', authController.refreshToken);

// POST /api/v1/auth/logout — Çıkış (refresh token iptal)
router.post('/logout', isAuthenticated, authController.logout);

// GET /api/v1/auth/me — Mevcut kullanıcı bilgisi
router.get('/me', isAuthenticated, authController.getMe);

// DELETE /api/v1/auth/me — Kullanıcı hesabı sil (KVKK)
router.delete('/me', isAuthenticated, authController.deleteMyAccount);

// POST /api/v1/auth/2fa/generate — 2FA Kurulumu (Admin)
router.post('/2fa/generate', isAuthenticated, authController.generate2FA);

// POST /api/v1/auth/2fa/verify — 2FA Doğrulama (Admin)
router.post('/2fa/verify', isAuthenticated, authController.verify2FA);

// PATCH /api/v1/auth/me — Profil bilgilerini güncelle
router.patch('/me', isAuthenticated, authController.updateProfile);

// PATCH /api/v1/auth/me/password — Şifre değiştir
router.patch('/me/password', isAuthenticated, authController.changePassword);

// POST /api/v1/auth/me/avatar — Profil fotoğrafı yükle
router.post(
  '/me/avatar',
  isAuthenticated,
  authController.avatarUpload.single('avatar'),
  authController.uploadAvatar,
);

// POST /api/v1/auth/forgot-password — Şifre sıfırlama e-postası gönder
router.post('/forgot-password', strictAuthRateLimit, authController.forgotPassword);

// POST /api/v1/auth/reset-password — Yeni şifre belirle
router.post('/reset-password', strictAuthRateLimit, authController.resetPassword);

export { router as authRouter };
