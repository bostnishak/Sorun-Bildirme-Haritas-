import { Request, Response } from 'express';
import { authService } from './auth.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';
import multer from 'multer';

// ─── Validation Schemas ────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalı.')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermeli.')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermeli.'),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  tcKimlik: z.string().length(11, 'T.C. Kimlik 11 haneli olmalıdır.').regex(/^\d+$/),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear() - 18),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Controllers ──────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(
      parsed.error.errors.map(e => e.message).join(', '),
    );
  }

  const result = await authService.register(parsed.data);

  res.status(201).json({
    success: true,
    message: 'Kayıt başarılı. Kimliğiniz NVİ üzerinden doğrulandı.',
    data: result,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz giriş bilgileri.');
  }

  const result = await authService.login(parsed.data.email, parsed.data.password);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError('Refresh token gerekli.');
  }

  const result = await authService.refresh(parsed.data.refreshToken);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken: token } = req.body;
  if (token) {
    await authService.revokeRefreshToken(token);
  }

  res.status(200).json({
    success: true,
    message: 'Çıkış yapıldı.',
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await authService.getUserById(req.user.sub);

  res.status(200).json({
    success: true,
    data: user,
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const user = await authService.updateProfile(req.user.sub, parsed.data as any);
  res.status(200).json({ success: true, message: 'Profil güncellendi.', data: user });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalı.')
      .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermeli.')
      .regex(/[0-9]/, 'Şifre en az bir rakam içermeli.'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  await authService.changePassword(req.user.sub, parsed.data);
  res.status(200).json({ success: true, message: 'Şifre başarıyla değiştirildi. Lütfen tekrar giriş yapın.' });
}

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece görsel dosyalar kabul edilir.'));
    }
  },
});

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new BadRequestError('Lütfen bir görsel dosyası yükleyin.');
  }
  const result = await authService.uploadAvatar(
    req.user.sub,
    req.file.buffer,
    req.file.mimetype,
  );
  res.status(200).json({ success: true, message: 'Profil fotoğrafı güncellendi.', data: result });
}
