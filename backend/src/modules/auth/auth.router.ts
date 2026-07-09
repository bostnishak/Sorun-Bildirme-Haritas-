import { Router } from 'express';
import * as authController from './auth.controller';
import { isAuthenticated } from '../../middleware/auth.middleware';
import { authRateLimit, nviRateLimit } from '../../middleware/rateLimiter.middleware';

const router = Router();

// POST /api/v1/auth/register — NVİ doğrulamalı kayıt
router.post('/register', nviRateLimit, authController.register);

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

export { router as authRouter };
