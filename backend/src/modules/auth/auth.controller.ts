import { Request, Response } from 'express';
import { authService } from './auth.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';

// ─── Validation Schemas ────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string()
    .min(8, 'Şifre en az 8 karakter olmalıdır.')
    .max(12, 'Şifre en fazla 12 karakter olmalıdır.')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir.')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir.')
    .regex(/[^A-Za-z0-9]/, 'Şifre en az bir özel karakter (!@#$%^&* vb.) içermelidir.'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(100),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır.').max(100),
  tcKimlik: z.string().length(11, 'T.C. Kimlik 11 haneli olmalıdır.').regex(/^\d+$/, 'T.C. Kimlik sadece rakamlardan oluşmalıdır.'),
  phone: z.string().regex(/^5\d{9}$/, 'Telefon numarası 5 ile başlayan 10 haneli olmalıdır (Örn: 5321234567).').optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear() - 18, 'Kayıt olmak için en az 18 yaşında olmalısınız.'),
  birthMonth: z.number().int().min(1).max(12).optional(),
  birthDay: z.number().int().min(1).max(31).optional(),
});

const verifyAccountSchema = z.object({
  email: z.string().email(),
  emailCode: z.string().length(6, 'E-posta doğrulama kodu 6 haneli olmalıdır.').optional(),
  smsCode: z.string().length(6, 'SMS doğrulama kodu 6 haneli olmalıdır.').optional(),
});

const resendCodesSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Sıfırlama tokeni gerekli.'),
  newPassword: z.string()
    .min(8, 'Yeni şifre en az 8 karakter olmalıdır.')
    .max(12, 'Yeni şifre en fazla 12 karakter olmalıdır.')
    .regex(/[A-Z]/, 'Yeni şifre en az bir büyük harf içermelidir.')
    .regex(/[a-z]/, 'Yeni şifre en az bir küçük harf içermelidir.')
    .regex(/[^A-Za-z0-9]/, 'Yeni şifre en az bir özel karakter (!@#$%^&* vb.) içermelidir.'),
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
    message: result.message,
    data: result,
  });
}

export async function verifyAccount(req: Request, res: Response): Promise<void> {
  const parsed = verifyAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map(e => e.message).join(', '));
  }

  const result = await authService.verifyAccount(parsed.data.email, parsed.data.emailCode, parsed.data.smsCode);

  res.status(200).json({
    success: true,
    message: 'Doğrulama başarılı! Hesabınız aktifleştirildi ve giriş yapıldı.',
    data: result,
  });
}

export async function resendCodes(req: Request, res: Response): Promise<void> {
  const parsed = resendCodesSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz e-posta adresi.');
  }

  const result = await authService.resendCodes(parsed.data.email);

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz e-posta adresi.');
  }

  const result = await authService.forgotPassword(parsed.data.email);

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map(e => e.message).join(', '));
  }

  const result = await authService.resetPassword(parsed.data.token, parsed.data.newPassword);

  res.status(200).json({
    success: true,
    message: result.message,
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
