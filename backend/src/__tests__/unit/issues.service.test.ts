/**
 * Issues Service Unit Tests
 * Prisma, Redis, BullMQ mock'lanır.
 */

jest.mock('../../config/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    issue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../config/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    scan: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../jobs/queue', () => ({
  webhookQueue: { add: jest.fn() },
  imageProcessingQueue: { add: jest.fn() },
}));

import { issuesService } from '../../modules/issues/issues.service';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { Role } from '@prisma/client';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis = redis as jest.Mocked<typeof redis>;

const mockIssue = {
  id: 'issue-uuid-1',
  title: 'Bozuk kaldırım',
  description: 'Mahalle meydanında büyük bir çukur var, tehlikeli.',
  category: 'TRANSPORTATION' as const,
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
  latitude: 41.0082,
  longitude: 28.9784,
  city: 'İstanbul',
  district: 'Fatih',
  address: 'Örnek Caddesi No:1',
  imageUrl: null,
  imageKey: null,
  imageBlurred: false,
  imageProcessed: false,
  exifLatitude: null,
  exifLongitude: null,
  exifVerified: false,
  exifDistance: null,
  llmGuardPassed: true,
  ipAddress: '127.0.0.1',
  userAgent: 'Test',
  reportedById: 'user-uuid-1',
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('issuesService', () => {

  beforeEach(() => jest.clearAllMocks());

  // ──── getById ───────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('mevcut sorun döner', async () => {
      (mockPrisma.issue.findUnique as jest.Mock).mockResolvedValue({
        ...mockIssue,
        reportedBy: { id: 'user-1', firstName: 'Ahmet', lastName: 'Yılmaz' },
        statusHistory: [],
      });

      const result = await issuesService.getById('issue-uuid-1');
      expect(result).toHaveProperty('id', 'issue-uuid-1');
    });

    it('bulunamayan sorun: NotFoundError fırlatır', async () => {
      (mockPrisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(issuesService.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  // ──── list ──────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('sayfalı sonuç döner', async () => {
      (mockPrisma.issue.findMany as jest.Mock).mockResolvedValue([mockIssue]);
      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(1);

      const result = await issuesService.list({ page: 1, limit: 10 });

      expect(result.issues).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('limit max 100 ile sınırlandırılır', async () => {
      (mockPrisma.issue.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.issue.count as jest.Mock).mockResolvedValue(0);

      await issuesService.list({ page: 1, limit: 500 });

      // findMany'a geçilen take değeri 100'ü aşmamalı
      const call = (mockPrisma.issue.findMany as jest.Mock).mock.calls[0][0];
      expect(call.take).toBeLessThanOrEqual(100);
    });
  });

  // ──── getMapClusters ────────────────────────────────────────────────────

  describe('getMapClusters()', () => {
    const bbox = { minLng: 28.0, minLat: 40.5, maxLng: 29.5, maxLat: 41.5, zoom: 10 };

    it('cache hit: Redis\'ten döner', async () => {
      const cached = [{ lng: 28.5, lat: 41.0, point_count: 5 }];
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cached));

      const result = await issuesService.getMapClusters(bbox);

      expect(result).toEqual(cached);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('cache miss: DB sorgulanır ve cache\'e yazılır', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      const dbResult = [{ lng: 28.9, lat: 41.0, point_count: 3 }];
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(dbResult);
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await issuesService.getMapClusters(bbox);

      expect(result).toEqual(dbResult);
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  // ──── updateStatus ──────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('SUPER_ADMIN herhangi bir sorunu güncelleyebilir', async () => {
      (mockPrisma.issue.findUnique as jest.Mock).mockResolvedValue(mockIssue);
      (mockPrisma.issue.update as jest.Mock).mockResolvedValue({
        ...mockIssue,
        status: 'IN_REVIEW',
      });
      (mockRedis.scan as jest.Mock).mockResolvedValue(['0', []]);

      const result = await issuesService.updateStatus(
        'issue-uuid-1',
        'IN_REVIEW',
        'admin-user-id',
        Role.SUPER_ADMIN,
      );

      expect(result.status).toBe('IN_REVIEW');
    });

    it('INSTITUTION_OFFICER yetki dışı sorun için ForbiddenError', async () => {
      (mockPrisma.issue.findUnique as jest.Mock).mockResolvedValue(mockIssue);
      // ST_Within false döner
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ within: false }]);

      await expect(
        issuesService.updateStatus(
          'issue-uuid-1',
          'IN_REVIEW',
          'officer-id',
          Role.INSTITUTION_OFFICER,
          'institution-id',
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('mevcut olmayan sorun için NotFoundError', async () => {
      (mockPrisma.issue.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        issuesService.updateStatus('nonexistent', 'IN_REVIEW', 'admin', Role.SUPER_ADMIN),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ──── invalidateClusterCache ─────────────────────────────────────────────

  describe('invalidateClusterCache()', () => {
    it('SCAN kullanarak key\'leri temizler (KEYS değil)', async () => {
      (mockRedis.scan as jest.Mock)
        .mockResolvedValueOnce(['cursor1', ['cluster:1', 'cluster:2']])
        .mockResolvedValueOnce(['0', ['cluster:3']]);
      (mockRedis.del as jest.Mock).mockResolvedValue(3);

      await issuesService.invalidateClusterCache('İstanbul', 'Fatih');

      // Tüm key'ler silinmeli
      expect(mockRedis.del).toHaveBeenCalledWith('cluster:1', 'cluster:2', 'cluster:3');
      // keys() hiç çağrılmamalı
      expect(mockRedis).not.toHaveProperty('keys');
    });

    it('Redis hatası sessizce yutulur (uyarı loglanır)', async () => {
      (mockRedis.scan as jest.Mock).mockRejectedValue(new Error('Redis down'));

      // Hata fırlatmamalı
      await expect(
        issuesService.invalidateClusterCache('İstanbul', 'Fatih'),
      ).resolves.toBeUndefined();
    });
  });

});
