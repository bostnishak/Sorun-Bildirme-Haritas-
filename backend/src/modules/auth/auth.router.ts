import { Router } from 'express';
import * as authController from './auth.controller';
import { isAuthenticated } from '../../middleware/auth.middleware';
import { authRateLimit, nviRateLimit } from '../../middleware/rateLimiter.middleware';

const router = Router();

// POST /api/v1/auth/register — NVİ doğrulamalı kayıt ve OTP gönderimi
router.post('/register', nviRateLimit, authController.register);

// POST /api/v1/auth/verify-account — E-posta ve SMS kodu ile hesap doğrulama
router.post('/verify-account', authRateLimit, authController.verifyAccount);

// POST /api/v1/auth/resend-codes — Doğrulama kodlarını yeniden gönder
router.post('/resend-codes', authRateLimit, authController.resendCodes);

// POST /api/v1/auth/forgot-password — Şifre sıfırlama talebi (E-posta ile link gönderimi)
router.post('/forgot-password', authRateLimit, authController.forgotPassword);

// POST /api/v1/auth/reset-password — Şifre sıfırlama (Token ve yeni şifre ile)
router.post('/reset-password', authRateLimit, authController.resetPassword);

// POST /api/v1/auth/login — Giriş
router.post('/login', authRateLimit, authController.login);

// POST /api/v1/auth/refresh — Access token yenile
router.post('/refresh', authController.refreshToken);

// POST /api/v1/auth/logout — Çıkış (refresh token iptal)
router.post('/logout', isAuthenticated, authController.logout);

// GET /api/v1/auth/me — Mevcut kullanıcı bilgisi
router.get('/me', isAuthenticated, authController.getMe);

export { router as authRouter };
