import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { verifyWithNVI, hashTCKimlik, validateTCKimlikFormat } from '../../services/nvi.service';
import { emailService } from '../../services/email.service';
import { smsService } from '../../services/sms.service';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tcKimlik: string;
  phone?: string;
  birthYear: number;
  birthMonth?: number;
  birthDay?: number;
}

export const authService = {
  async register(dto: RegisterDto) {
    // 1. T.C. Kimlik Matematiksel Algoritma Kontrolü (7'ye ve 10'a bölme kuralları)
    if (!validateTCKimlikFormat(dto.tcKimlik)) {
      throw new BadRequestError(
        'Geçersiz T.C. Kimlik Numarası (Matematiksel algoritma doğrulaması başarısız: 7\'ye ve 10\'a bölme kuralına uymuyor).'
      );
    }

    // 2. Email benzersizlik kontrolü
    const existingEmail = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictError('Bu e-posta adresiyle sistemde kayıtlı bir hesap zaten bulunmaktadır.');
    }

    // 3. Telefon benzersizlik kontrolü
    if (dto.phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhone) {
        throw new ConflictError('Bu telefon numarası ile sisteme daha önce kayıt olunmuştur.');
      }
    }

    // 4. T.C. Kimlik benzersizlik kontrolü
    const tcKimlikHash = hashTCKimlik(dto.tcKimlik);
    const existingTc = await prisma.user.findUnique({ where: { tcKimlikHash } });
    if (existingTc) {
      throw new ConflictError('Bu T.C. Kimlik numarası ile sisteme daha önce kayıt olunmuştur.');
    }

    // 5. NVİ Doğrulama denemesi (Kullanıcı adı/yılı eşleşmiyorsa veya servis kapalıysa bile algoritma doğruysa hata fırlatma, esnek kabul et)
    try {
      const isNviOk = await verifyWithNVI({
        tcKimlik: dto.tcKimlik,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthYear: dto.birthYear,
      });
      if (!isNviOk) {
        logger.warn('NVİ isim/yıl eşleşmesi sağlayamadı, ancak T.C. Kimlik algoritması geçerli olduğundan işleme devam ediliyor.');
      }
    } catch (err: any) {
      logger.warn(`NVİ servisi ulaşılamadı veya doğrulayamadı (${err.message}). Algoritma kontrolü geçerli, kayıt devam ediyor.`);
    }

    // 6. Şifre hash ve OTP Doğrulama Kodları Üretimi
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smsVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 7. Önceki doğrulanmamış geçici kayıtları temizle (tekrar deneme / yazım hatası durumları için)
    await prisma.pendingRegistration.deleteMany({
      where: {
        OR: [
          { email: dto.email },
          { tcKimlikHash },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    // 8. Kullanıcıyı User tablosuna ASLA yazma! Doğrulanana kadar PendingRegistration tablosunda tut
    const pending = await prisma.pendingRegistration.create({
      data: {
        email: dto.email,
        passwordHash,
        tcKimlikHash,
        phone: dto.phone || null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthYear: dto.birthYear,
        emailVerifyCode,
        smsVerifyCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 dakika geçerli
      },
    });

    logger.info('Doğrulanmamış geçici kayıt oluşturuldu (PendingRegistration)', { id: pending.id, email: pending.email });

    // 9. E-posta ve SMS Doğrulama Kodlarını Gönder
    await emailService.sendVerificationEmail(pending.email, pending.firstName || 'Değerli Kullanıcımız', emailVerifyCode);
    if (pending.phone) {
      await smsService.sendVerificationSms(pending.phone, smsVerifyCode);
    }

    return {
      requireVerification: true,
      email: pending.email,
      phone: pending.phone,
      message: 'Kayıt başarılı! Lütfen e-posta veya telefonunuza gelen 6 haneli doğrulama kodunu girin.',
    };
  },

  /**
   * E-posta ve SMS Doğrulama Kodu ile Hesabı Aktifleştirme (Kalıcı User Kaydı Oluşturma)
   */
  async verifyAccount(email: string, emailCode?: string, smsCode?: string) {
    // Önceden doğrulanmış kalıcı kullanıcı mı?
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        const { accessToken, refreshToken } = await this.createTokenPair(existingUser.id, existingUser.role);
        return {
          user: { id: existingUser.id, email: existingUser.email, firstName: existingUser.firstName, lastName: existingUser.lastName, role: existingUser.role, isVerified: true },
          accessToken,
          refreshToken,
        };
      }
    }

    // Geçici kayıtlar (PendingRegistration) tablosunda ara
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) {
      throw new NotFoundError('Doğrulama bekleyen hesap bulunamadı veya süresi dolmuş. Lütfen yeniden kayıt olun.');
    }

    if (pending.expiresAt < new Date()) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } });
      throw new BadRequestError('Doğrulama kodunun süresi dolmuş. Lütfen yeniden kayıt olun.');
    }

    if (!emailCode && !smsCode) {
      throw new BadRequestError('Doğrulama için e-posta veya SMS kodundan en az biri girilmelidir.');
    }

    if (emailCode && pending.emailVerifyCode !== emailCode.trim()) {
      throw new BadRequestError('E-posta doğrulama kodu hatalı.');
    }

    if (smsCode && pending.phone && pending.smsVerifyCode !== smsCode.trim()) {
      throw new BadRequestError('SMS doğrulama kodu hatalı.');
    }

    // Doğrulama başarılı! ŞİMDİ User tablosuna kesin olarak isVerified: true ile kaydet
    const newUser = await prisma.user.create({
      data: {
        email: pending.email,
        passwordHash: pending.passwordHash,
        tcKimlikHash: pending.tcKimlikHash,
        phone: pending.phone,
        firstName: pending.firstName,
        lastName: pending.lastName,
        birthYear: pending.birthYear,
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

    // Geçici kaydı sil
    await prisma.pendingRegistration.delete({ where: { id: pending.id } });

    logger.info('Kullanıcı hesabı doğrulandı ve sisteme kalıcı olarak kaydedildi', { userId: newUser.id });

    const { accessToken, refreshToken } = await this.createTokenPair(newUser.id, newUser.role);
    return { user: newUser, accessToken, refreshToken };
  },

  /**
   * Doğrulama kodlarını yeniden gönder
   */
  async resendCodes(email: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.isVerified) {
      throw new BadRequestError('Bu hesap zaten doğrulanmış.');
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) {
      throw new NotFoundError('Doğrulama bekleyen hesap bulunamadı. Lütfen yeniden kayıt olun.');
    }

    const emailVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smsVerifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        emailVerifyCode,
        smsVerifyCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await emailService.sendVerificationEmail(pending.email, pending.firstName || 'Değerli Kullanıcımız', emailVerifyCode);
    if (pending.phone) {
      await smsService.sendVerificationSms(pending.phone, smsVerifyCode);
    }

    return { success: true, message: 'Doğrulama kodları e-posta ve telefonunuza yeniden gönderildi.' };
  },

  /**
   * Şifremi Unuttum (Sıfırlama linki gönder)
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.info(`Şifre sıfırlama talebi: Kayıtlı olmayan e-posta (${email})`);
      return {
        success: true,
        message: 'Eğer bu e-posta adresiyle sistemde kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderilmiştir.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat geçerli

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expiresAt,
      },
    });

    await emailService.sendPasswordResetEmail(user.email, user.firstName || 'Değerli Kullanıcımız', resetToken);

    return {
      success: true,
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
    };
  },

  /**
   * Şifre Sıfırla
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { resetPasswordToken: token } });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestError('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı. Lütfen yeni bir talep oluşturun.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    logger.info('Kullanıcı şifresini sıfırladı', { userId: user.id });

    return {
      success: true,
      message: 'Şifreniz başarıyla sıfırlandı. Artık yeni şifrenizle giriş yapabilirsiniz.',
    };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedError('E-posta veya şifre hatalı.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('E-posta veya şifre hatalı.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedError('Hesabınız henüz doğrulanmamış. Lütfen kayıt sırasında gönderilen doğrulama kodlarını girin.');
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
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Geçersiz veya süresi dolmuş refresh token.');
    }

    await prisma.refreshToken.delete({ where: { token } });

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
        phone: true,
        firstName: true,
        lastName: true,
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

  async createTokenPair(userId: string, role: string, institutionId?: string) {
    const accessToken = generateAccessToken({
      sub: userId,
      role: role as any,
      institutionId,
    });

    const refreshTokenStr = generateRefreshToken(userId);
    const expiresAt = parseExpiresIn(env.JWT_REFRESH_EXPIRES);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId,
        expiresAt,
      },
    });

    await prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

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
};

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
      now.setDate(now.getDate() + 7);
  }

  return now;
}
