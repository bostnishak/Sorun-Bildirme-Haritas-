import { registry } from './swagger';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ─── Ortak Tipler ───────────────────────────────────────────────────────────

const ErrorSchema = registry.register('ErrorResponse', z.object({
  success: z.boolean().default(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
}));

const MapClusterSchema = registry.register('MapCluster', z.object({
  lng: z.number(),
  lat: z.number(),
  point_count: z.number(),
  ids: z.array(z.string()),
  dominant_category: z.string(),
  dominant_status: z.string(),
  dominant_priority: z.string(),
}));

const IssueSchema = registry.register('Issue', z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.string(),
  status: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  city: z.string(),
  district: z.string(),
  address: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}));

// ─── Path Kayıtları ─────────────────────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/issues/map-cluster',
  summary: 'Harita kümelenme (cluster) verilerini getirir',
  tags: ['Issues'],
  request: {
    query: z.object({
      minLng: z.string(),
      minLat: z.string(),
      maxLng: z.string(),
      maxLat: z.string(),
      zoom: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Başarılı',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(true),
            data: z.array(MapClusterSchema),
          }),
        },
      },
    },
    400: {
      description: 'Geçersiz parametreler',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/issues',
  summary: 'Sorunları listeler (Sayfalı)',
  tags: ['Issues'],
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Başarılı',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(true),
            data: z.array(IssueSchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  summary: 'Kullanıcı girişi',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Giriş başarılı',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().default(true),
            data: z.object({
              user: z.object({
                id: z.string(),
                email: z.string(),
                role: z.string(),
              }),
              accessToken: z.string(),
              refreshToken: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Yetkisiz',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});
