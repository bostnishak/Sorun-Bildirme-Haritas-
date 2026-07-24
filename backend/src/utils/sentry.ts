import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from '../config/env';
import { logger } from './logger';

export function initSentry() {
  if (process.env.SENTRY_DSN && env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 1.0, 
      profilesSampleRate: 1.0,
      environment: env.NODE_ENV,
    });
    logger.info('[SECURITY] Sentry aktif edildi.');
  } else {
    logger.warn('[WARN] SENTRY_DSN bulunamadı. Sentry devre dışı bırakıldı.');
  }
}
