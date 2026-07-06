/**
 * Auth Service Unit Tests
 * Prisma ve dış servisler (NVİ, nodemailer) mock'lanır.
 */

import bcrypt from 'bcryptjs';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../../services/nvi.service', () => ({
  verifyWithNVI: jest.fn(),
  hashTCKimlik: jest.fn().mockReturnValue('hashed_tc_kimlik'),
}));

jest.mock('../../../middleware/auth.middleware', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock_access_token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
  verifyRefreshToken: jest.fn(),
}));

// ─── Imports (mock'lardan sonra) ─────────────────────────────────────────────

import { authService } from '../../modules/auth/auth.service';
import { prisma } from '../../config/database';
import { verifyWithNVI } from '../../services/nvi.service';
import { ConflictError, UnauthorizedError, BadRequestError } from '../../utils/errors';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockVerifyWithNVI = verifyWithNVI as jest.MockedFunction<typeof verifyWithNVI>;

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  passwordHash: '',
  role: 'CITIZEN' as const,
  isVerified: true,
  firstName: 'Test',
  lastName: 'User',
  birthYear: 1990,
  tcKimlikHash: 'hashed_tc_kimlik',
  institutionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  institution: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authService', () => {

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Test1234!', 12);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──── register ──────────────────────────────────────────────────────────

  describe('register()', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'NewPass123!',
      firstName: 'Ahmet',
      lastName: 'Yilmaz',
      tcKimlik: '12345678901',
      birthYear: 1995,
    };

    it('başarılı kayıt: user, accessToken, refreshToken döner', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      mockVerifyWithNVI.mockResolvedValue(true);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
      });
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user).toHaveProperty('email', registerDto.email);
    });

    it('email çakışması: ConflictError fırlatır', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictError);
    });

    it('NVİ doğrulama başarısız: BadRequestError fırlatır', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      mockVerifyWithNVI.mockResolvedValue(false);

      await expect(authService.register(registerDto)).rejects.toThrow(BadRequestError);
    });
  });

  // ──── login ─────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('başarılı giriş: token çifti döner', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await authService.login(mockUser.email, 'Test1234!');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('kullanıcı bulunamadı: UnauthorizedError fırlatır', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('none@example.com', 'pass')).rejects.toThrow(UnauthorizedError);
    });

    it('yanlış şifre: UnauthorizedError fırlatır', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(mockUser.email, 'WrongPass!')).rejects.toThrow(UnauthorizedError);
    });
  });

  // ──── refresh ───────────────────────────────────────────────────────────

  describe('refresh()', () => {
    const validToken = 'valid_refresh_token';

    it('geçerli token: yeni token çifti döner', async () => {
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        token: validToken,
        expiresAt: new Date(Date.now() + 86400000), // 1 gün sonra
        user: mockUser,
      });
      (mockPrisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await authService.refresh(validToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      // Eski token silinmiş olmalı (rotation)
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { token: validToken } });
    });

    it('süresi dolmuş token: UnauthorizedError fırlatır', async () => {
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        token: validToken,
        expiresAt: new Date(Date.now() - 1000), // Geçmiş
        user: mockUser,
      });

      await expect(authService.refresh(validToken)).rejects.toThrow(UnauthorizedError);
    });

    it('bulunamayan token: UnauthorizedError fırlatır', async () => {
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.refresh('invalid_token')).rejects.toThrow(UnauthorizedError);
    });
  });

  // ──── revokeRefreshToken ─────────────────────────────────────────────────

  describe('revokeRefreshToken()', () => {
    it('token başarıyla iptal edilir', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await authService.revokeRefreshToken('some_token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some_token' },
      });
    });
  });

});
