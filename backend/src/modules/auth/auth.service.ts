import bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { verifyWithNVI, hashTCKimlik } from '../../services/nvi.service';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';
import { randomUUID } from 'crypto';
import { emailService } from '../../services/email.service';
import { minio } from '../../services/storage.service';
interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // TC kimlik artık opsiyonel — e-posta ile de kayıt olunabilir
  tcKimlik?: string;
  birthYear?: number;
}

export const authService = {
  async register(dto: RegisterDto) {
    // Email çakışması kontrolü
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictError('Bu e-posta adresi zaten kullanımda.');
    }

    // Şifre hash
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // ─── NVİ Doğrulama (OPSİYONEL) ─────────────────────────────────────────
    // TC kimlik verilmişse NVİ ile doğrula → isVerified: true
    // TC kimlik verilmemişse e-posta ile kayıt → isVerified: false
    let isVerified = false;
    let tcKimlikHash: string | undefined = undefined;

    if (dto.tcKimlik && dto.birthYear) {
      try {
        const nviResult = await verifyWithNVI({
          tcKimlik: dto.tcKimlik,
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthYear: dto.birthYear,
        });

        if (typeof nviResult === 'object' && nviResult.bypassed) {
          throw new ServiceUnavailableError('NVİ servisi devre dışı (Circuit Open)');
        }

        if (!nviResult) {
          throw new BadRequestError(
            'Kimlik bilgileri doğrulanamadı. ' +
            'T.C. Kimlik, Ad, Soyad ve Doğum Yılı bilgilerini kontrol edin.',
          );
        }

        isVerified = true;
        tcKimlikHash = hashTCKimlik(dto.tcKimlik);
        logger.info('NVİ doğrulaması başarılı', { email: dto.email });
      } catch (err) {
        // NVİ servisi erişilemez durumdaysa kaydı bloklama,
        // kullanıcıya sonradan kimlik doğrulama imkânı sun
        if (err instanceof BadRequestError) throw err;
        logger.warn('NVİ servisine ulaşılamadı, e-posta ile devam ediliyor', {
          email: dto.email,
          error: (err as Error).message,
        });
      }
    }

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        ...(tcKimlikHash && { tcKimlikHash }),
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(dto.birthYear && { birthYear: dto.birthYear }),
        isVerified,
        role: 'CITIZEN',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    logger.info('Yeni kullanıcı kaydedildi', {
      userId: user.id,
      email: user.email,
      nviVerified: isVerified,
    });

    // Token çifti
    const { accessToken, refreshToken } = await this.createTokenPair(user.id, user.role);

    return {
      user,
      accessToken,
      refreshToken,
      // Kullanıcıyı NVİ doğrulaması yapması için yönlendirmek amacıyla
      nviVerified: isVerified,
      message: isVerified
        ? 'Kayıt başarılı. Kimliğiniz doğrulandı.'
        : 'Kayıt başarılı. Kimliğinizi doğrulayarak "Doğrulanmış Vatandaş" rozeti kazanabilirsiniz.',
    };
  },

  /**
   * Sonradan TC Kimlik doğrulama — giriş yapmış kullanıcılar için
   * Başarılıysa isVerified: true ve tcKimlikHash güncellenir
   */
  async verifyIdentity(userId: string, dto: {
    tcKimlik: string;
    firstName: string;
    lastName: string;
    birthYear: number;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Kullanıcı');

    // Zaten doğrulanmışsa tekrar yapma
    if (user.isVerified && user.tcKimlikHash) {
      throw new BadRequestError('Kimliğiniz zaten doğrulanmış.');
    }

    // TC Kimlik daha önce sisteme eklenmiş mi? (başka kullanıcı aynı TC ile kayıtlı olabilir)
    const tcHash = hashTCKimlik(dto.tcKimlik);
    const existingWithSameTc = await prisma.user.findFirst({
      where: { tcKimlikHash: tcHash, id: { not: userId } },
    });
    if (existingWithSameTc) {
      throw new ConflictError('Bu T.C. Kimlik numarası başka bir hesaba bağlı.');
    }

    // NVİ
    try {
      const nviResult = await verifyWithNVI({
        tcKimlik: dto.tcKimlik,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthYear: dto.birthYear,
      });

      if (typeof nviResult === 'object' && nviResult.bypassed) {
        throw new ServiceUnavailableError('NVİ servisi şu an devre dışı (Circuit Open). Lütfen daha sonra tekrar deneyiniz.');
      }

      if (!nviResult) {
        throw new BadRequestError(
          'Kimlik bilgileri doğrulanamadı. Lütfen T.C. Kimlik Numaranızı, ' +
          'Ad, Soyad ve Doğum Yılı bilgilerinizi kontrol edin.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      throw new ServiceUnavailableError('NVİ servislerine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyiniz.');
    }

    // Kullanıcıyı güncelle
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        tcKimlikHash: tcHash,
        birthYear: dto.birthYear,
      },
      select: {
        id: true, email: true, firstName: true,
        lastName: true, role: true, isVerified: true,
      },
    });

    logger.info('Kullanıcı kimliğini doğruladı (NVİ)', { userId });
    return {
      user: updated,
      message: '"Doğrulanmış Vatandaş" rozeti kazanıldı. Bildirimleriniz kurumlar tarafından öncelikli incelenecek.',
    };
  },

  async login(email: string, password: string, twoFactorToken?: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedError('E-posta veya şifre hatalı.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('E-posta veya şifre hatalı.');
    }

    // 2FA Kontrolü
    if (user.isTwoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorToken) {
        throw new UnauthorizedError('2FA kodu gereklidir.');
      }

      const isTokenValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
      });

      if (!isTokenValid) {
        throw new UnauthorizedError('Geçersiz 2FA kodu.');
      }
    }

    const { accessToken, refreshToken } = await this.createTokenPair(
      user.id,
      user.role,
      user.institutionId ?? undefined,
    );

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
    };

    return { user: userResponse, accessToken, refreshToken };
  },

  async refresh(token: string) {
    // Token DB'de var mı ve süresi dolmamış mı?
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Geçersiz veya süresi dolmuş refresh token.');
    }

    // Eski token'ı sil (rotation)
    await prisma.refreshToken.delete({ where: { token } });

    // Yeni token çifti
    const { accessToken, refreshToken } = await this.createTokenPair(
      stored.user.id,
      stored.user.role,
      stored.user.institutionId ?? undefined,
    );

    return { accessToken, refreshToken };
  },

  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
  },

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        institution: {
          select: { id: true, name: true, city: true, district: true },
        },
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundError('Kullanıcı');
    return user;
  },

  async deleteUserAccount(userId: string) {
    // KVKK: Unutulma Hakkı (Right to Erasure)
    // Prisma şemasında Cascade tanımlandığı için bağlı tüm ilişkiler silinecek
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı.');

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('Kullanıcı hesabı ve bağlı tüm veriler kalıcı olarak silindi (KVKK).', { userId });
  },
  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        phone: dto.phone ?? null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
      },
    });
    logger.info('Kullanıcı profili güncellendi', { userId });
    return user;
  },

  async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Kullanıcı');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Mevcut şifre hatalı.');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Tüm refresh token'ları iptal et (güvenlik)
    await prisma.refreshToken.deleteMany({ where: { userId } });

    logger.info('Kullanıcı şifresi değiştirildi', { userId });
  },

  async uploadAvatar(userId: string, buffer: Buffer, mimeType: string) {
    const ext = mimeType.split('/')[1] || 'jpg';
    const { randomUUID } = crypto;
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;
    const bucket = env.MINIO_BUCKET;

    await minio.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': mimeType });

    // Eski avatarı sil
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });
    if (existing?.avatarKey) {
      try { await minio.removeObject(bucket, existing.avatarKey); } catch { /* yoksay */ }
    }

    // MinIO public URL (minio:9000 internal → env.MINIO_PUBLIC_URL external)
    const avatarUrl = `${env.MINIO_PUBLIC_URL}/${bucket}/${key}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl, avatarKey: key },
    });

    logger.info('Avatar yüklendi', { userId, key });
    return { avatarUrl };
  },

  async forgotPassword(email: string) {
    // Kullanıcı bulunamasa bile hata verme — enumeration saldırısına karşı güvenlik
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn('Forgot password: e-posta bulunamadı', { email });
      return; // sessizce
    }

    // Eski token'ları sil
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Yeni token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // E-posta gönder
    await emailService.sendPasswordResetEmail(email, user.firstName || email, token);
  },

  async resetPassword(token: string, newPassword: string) {
    // Token'i DB'de bul
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken) {
      throw new BadRequestError('Geçersiz veya süresi dolmuş sıfırlama bağlantısı.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestError('Sıfırlama bağlantısının süresi dolmuş. Lütfen tekrar talep edin.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Token'i ve tüm refresh token'ları iptal et
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } });

    logger.info('Şifre başarıyla sıfırlandı', { userId: resetToken.userId });
  },

  async createTokenPair(userId: string, role: string, institutionId?: string) {
    const accessToken = generateAccessToken({
      sub: userId,
      role: role as any,
      institutionId,
    });

    const refreshTokenStr = generateRefreshToken(userId);

    // JWT_REFRESH_EXPIRES'dan geçerlilik süresini hesapla ("7d", "30d", "2h" vb.)
    const expiresAt = parseExpiresIn(env.JWT_REFRESH_EXPIRES);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId,
        expiresAt,
      },
    });

    // Kullanıcının eski expired token'larını temizle
    await prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    // Kullanıcı başına en fazla 5 aktif session — en eskisini sil
    const activeTokens = await prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    if (activeTokens.length > 5) {
      const toDelete = activeTokens.slice(0, activeTokens.length - 5);
      await prisma.refreshToken.deleteMany({
        where: { id: { in: toDelete.map((t) => t.id) } },
      });
    }

    return { accessToken, refreshToken: refreshTokenStr };
  },

  async generate2FA(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `Etiya Project (${email})`,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
    };
  },

  async verifyAndEnable2FA(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestError('2FA kurulumu başlatılmamış.');
    }

    const isTokenValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!isTokenValid) {
      throw new BadRequestError('Geçersiz 2FA kodu.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true },
    });

    logger.info('Kullanıcı 2FA özelliğini aktifleştirdi.', { userId });
  },
};

/**
 * "7d", "15m", "2h" gibi JWT sürelerini Date'e çevirir
 */
function parseExpiresIn(expiresIn: string): Date {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);
  const now = new Date();

  switch (unit) {
    case 's': now.setSeconds(now.getSeconds() + value); break;
    case 'm': now.setMinutes(now.getMinutes() + value); break;
    case 'h': now.setHours(now.getHours() + value); break;
    case 'd': now.setDate(now.getDate() + value); break;
    default:
      // Fallback: 7 gün
      now.setDate(now.getDate() + 7);
  }

  return now;
}
