import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Varsayılan Node.js metriklerini topla (memory, event loop vs)
client.collectDefaultMetrics({ prefix: 'etiya_project_' });

// ─── Custom Metrics ──────────────────────────────────────────────────────────

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'etiya_project_http_request_duration_ms',
  help: 'HTTP istek süreleri (ms cinsinden)',
  labelNames: ['method', 'route', 'code'],
  buckets: [10, 50, 100, 300, 500, 1000, 3000, 5000],
});

export const activeIssuesGauge = new client.Gauge({
  name: 'etiya_project_active_issues_total',
  help: 'Sistemdeki aktif sorun sayısı',
  labelNames: ['status', 'category'],
});

export const aiModerationDurationHistogram = new client.Histogram({
  name: 'etiya_project_ai_duration_ms',
  help: 'AI Moderasyon ve işlem süreleri (ms)',
  labelNames: ['layer', 'model'],
  buckets: [50, 100, 300, 500, 1000, 2000, 5000, 10000],
});

export const openAITokensTotal = new client.Counter({
  name: 'etiya_project_openai_tokens_total',
  help: 'OpenAI toplam token tüketimi',
  labelNames: ['model', 'purpose'],
});

export const openAIGuardrailFailureTotal = new client.Counter({
  name: 'etiya_project_openai_guardrail_failure_total',
  help: 'OpenAI Semantic Guardrail hatalarının toplam sayısı',
  labelNames: ['reason'],
});

// ─── Middleware ─────────────────────────────────────────────────────────────

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    // Sadece /api/ rotalarını ölç, health/metrics gibi iç endpoint'leri atla
    if (req.originalUrl.startsWith('/api/') && !req.originalUrl.includes('/docs')) {
      const duration = Date.now() - start;
      const route = req.route ? req.route.path : req.path;
      httpRequestDurationMicroseconds
        .labels(req.method, route, res.statusCode.toString())
        .observe(duration);
    }
  });

  next();
};

export const getMetrics = async () => {
  return await client.register.metrics();
};
