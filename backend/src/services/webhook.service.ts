import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  version: string;
  data: Record<string, unknown>;
}

/**
 * HMAC-SHA256 imzası oluşturur
 * Alıcı sistem imzayı doğrulayarak isteğin gerçekten Etiya Project'ten geldiğini anlar
 */
export function generateWebhookSignature(payload: WebhookPayload): string {
  const body = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', env.WEBHOOK_HMAC_SECRET)
    .update(body)
    .digest('hex');
}

/**
 * Webhook gönderimi — retry mekanizması BullMQ tarafında yönetilir
 */
export async function dispatchWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  const signature = generateWebhookSignature(payload);
  const body = JSON.stringify(payload);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Etiya-Signature': `sha256=${signature}`,
        'X-Etiya-Event': payload.event,
        'X-Etiya-Timestamp': payload.timestamp,
        'User-Agent': 'Etiya-Webhook/1.0',
      },
      timeout: 15000,
      maxRedirects: 3,
    });

    logger.info('Webhook gönderildi', {
      url,
      event: payload.event,
      status: response.status,
    });
  } catch (err) {
    logger.error('Webhook gönderilemedi', {
      url,
      event: payload.event,
      error: String(err),
    });
    throw err; // BullMQ retry için hata fırlatılır
  }
}

/**
 * Yeni sorun bildirimi webhook payload'ı
 */
export function buildIssueCreatedPayload(issue: any): WebhookPayload {
  return {
    event: 'issue.created',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      issueId: issue.id,
      title: issue.title,
      category: issue.category,
      priority: issue.priority,
      status: issue.status,
      location: {
        latitude: issue.latitude,
        longitude: issue.longitude,
        city: issue.city,
        district: issue.district,
        address: issue.address,
      },
      reportedAt: issue.createdAt,
      viewUrl: `${env.APP_URL}/issues/${issue.id}`,
    },
  };
}

/**
 * Durum değişikliği webhook payload'ı
 */
export function buildStatusChangedPayload(issue: any, previousStatus: string): WebhookPayload {
  return {
    event: 'issue.status_changed',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      issueId: issue.id,
      title: issue.title,
      previousStatus,
      newStatus: issue.status,
      priority: issue.priority,
      location: {
        city: issue.city,
        district: issue.district,
      },
      updatedAt: issue.updatedAt,
      viewUrl: `${env.APP_URL}/issues/${issue.id}`,
    },
  };
}
