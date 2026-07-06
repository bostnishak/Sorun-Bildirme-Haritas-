import { OpenApiGeneratorV3, OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ─── Güvenlik Şeması (Bearer JWT) ───────────────────────────────────────────
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ─── Metadata ───────────────────────────────────────────────────────────────
export function generateOpenApiDocument() {
  // Şemaları registry'e yükle
  require('./openapi.schemas');

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'ChaosMind API',
      description: 'Türkiye Sorun Bildirim Haritası REST API Dokümantasyonu',
    },
    servers: [{ url: `/api/v1` }],
  });
}

// ─── Setup Fonksiyonu ───────────────────────────────────────────────────────
export function setupSwagger(app: Express) {
  const document = generateOpenApiDocument();

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(document, {
    customSiteTitle: 'ChaosMind API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}
