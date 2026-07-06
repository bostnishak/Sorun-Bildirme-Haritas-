import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

describe('Issues E2E Tests', () => {
  let superAdminToken: string;
  let citizenToken: string;
  let testIssueId: string;

  beforeAll(async () => {
    // Redis'i temizle
    await redis.flushall();

    // Super Admin oluştur
    const admin = await prisma.user.create({
      data: {
        email: 'admin@e2e.test',
        passwordHash: await bcrypt.hash('Test1234!', 10),
        firstName: 'E2E',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        isVerified: true,
      },
    });
    superAdminToken = generateAccessToken({ sub: admin.id, role: admin.role });

    // Vatandaş oluştur
    const citizen = await prisma.user.create({
      data: {
        email: 'citizen@e2e.test',
        passwordHash: await bcrypt.hash('Test1234!', 10),
        firstName: 'E2E',
        lastName: 'Citizen',
        role: Role.CITIZEN,
        isVerified: true,
      },
    });
    citizenToken = generateAccessToken({ sub: citizen.id, role: citizen.role });
  });

  describe('POST /api/v1/issues', () => {
    it('Vatandaş geçerli verilerle sorun bildirebilir', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          title: 'Çukur',
          description: 'Yolda derin bir çukur var',
          category: 'TRANSPORTATION',
          latitude: 41.0082,
          longitude: 28.9784,
          city: 'İstanbul',
          district: 'Fatih',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('OPEN');

      testIssueId = res.body.data.id;
    });

    it('Token olmadan yetkisiz hatası verir', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .send({
          title: 'Çukur',
          description: 'Yolda derin bir çukur var',
          category: 'TRANSPORTATION',
          latitude: 41.0082,
          longitude: 28.9784,
          city: 'İstanbul',
          district: 'Fatih',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/issues/:id', () => {
    it('Mevcut bir sorunun detaylarını getirir', async () => {
      const res = await request(app)
        .get(`/api/v1/issues/${testIssueId}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testIssueId);
      expect(res.body.data.title).toBe('Çukur');
    });

    it('Bulunamayan sorun için 404 döner', async () => {
      const res = await request(app)
        .get('/api/v1/issues/non-existent-id')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/issues/:id/status', () => {
    it('Vatandaş sorunun statüsünü değiştiremez', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${testIssueId}/status`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'IN_REVIEW' });

      expect(res.status).toBe(403); // Forbidden
    });

    it('Super Admin sorunun statüsünü değiştirebilir', async () => {
      const res = await request(app)
        .patch(`/api/v1/issues/${testIssueId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'IN_REVIEW', note: 'Ekipler yönlendirildi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_REVIEW');
    });
  });

  describe('GET /api/v1/issues/map-cluster', () => {
    it('Bbox içindeki clusterları getirir', async () => {
      const res = await request(app)
        .get('/api/v1/issues/map-cluster')
        .query({
          minLng: 28.0,
          minLat: 40.0,
          maxLng: 29.0,
          maxLat: 42.0,
          zoom: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Daha önce oluşturulan sorun bu bbox içindeyse 1 eleman bekleyebiliriz (ancak Redis cluster logic DB/ST_ClusterDBSCAN'a bağlı)
    });
  });
});
