import bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { Client as MinioClient } from 'minio';
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
} from '../../utils/errors';
import { logger } from '../../utils/logger';
import { randomUUID } from 'crypto';
import { transporter } from '../../config/nodemailer';

const minio = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});


interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tcKimlik: string;
  birthYear: number;
}

export const authService = {
  async register(dto: RegisterDto) {
    // Email çakışması kontrolü
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictError('Bu e-posta adresi zaten kullanımda.');
    }

    // NVİ doğrulama
    const isVerified = await verifyWithNVI({
      tcKimlik: dto.tcKimlik,
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthYear: dto.birthYear,
    });

    if (!isVerified) {
      throw new BadRequestError(
        'Kimlik bilgileri doğrulanamadı. ' +
        'T.C. Kimlik, Ad, Soyad ve Doğum Yılı bilgilerini kontrol edin.',
      );
    }

    // Şifre hash
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // TC Kimlik hash (KVKK — plaintext saklanmaz)
    const tcKimlikHash = hashTCKimlik(dto.tcKimlik);

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        tcKimlikHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthYear: dto.birthYear,
        isVerified: true,
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

    logger.info('Yeni kullanıcı kaydedildi', { userId: user.id, email: user.email });

    // Token çifti
    const { accessToken, refreshToken } = await this.createTokenPair(user.id, user.role);

    return { user, accessToken, refreshToken };
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
    const { minio } = await import('../../services/storage.service');

    await minio.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': mimeType });

    // Eski avatarı sil
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });
    if (existing?.avatarKey) {
      try { await minio.removeObject(bucket, existing.avatarKey); } catch { /* yoksay */ }
    }

    // MinIO public URL (minio:9000 internal → localhost:9000 external)
    const avatarUrl = `http://localhost:9000/${bucket}/${key}`;

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
    await prisma.$executeRaw`
      DELETE FROM password_reset_tokens WHERE user_id = ${user.id}::uuid
    `;

    // Yeni token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    await prisma.$executeRaw`
      INSERT INTO password_reset_tokens (id, token, user_id, expires_at, created_at)
      VALUES (uuid_generate_v4(), ${token}, ${user.id}::uuid, ${expiresAt}, now())
    `;

    const { emailService } = await import('../../services/email.service');

    // E-posta gönder
    await emailService.sendPasswordResetEmail(email, user.firstName || email, token);
  },

  async resetPassword(token: string, newPassword: string) {
    // Token'i DB'de bul
    const rows: any[] = await prisma.$queryRaw`
      SELECT prt.id, prt.user_id, prt.expires_at
      FROM password_reset_tokens prt
      WHERE prt.token = ${token}
      LIMIT 1
    `;

    if (!rows.length) {
      throw new BadRequestError('Geçersiz veya süresi dolmuş sıfırlama bağlantısı.');
    }

    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) {
      throw new BadRequestError('Sıfırlama bağlantısının süresi dolmuş. Lütfen tekrar talep edin.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: row.user_id },
      data: { passwordHash },
    });

    // Token'i ve tüm refresh token'ları iptal et
    await prisma.$executeRaw`DELETE FROM password_reset_tokens WHERE id = ${row.id}::uuid`;
    await prisma.refreshToken.deleteMany({ where: { userId: row.user_id } });

    logger.info('Şifre başarıyla sıfırlandı', { userId: row.user_id });
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
      name: `ChaosMind (${email})`,
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
