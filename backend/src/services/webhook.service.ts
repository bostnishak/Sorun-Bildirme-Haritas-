import crypto from 'crypto';
import axios from 'axios';
import dns from 'dns/promises';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  version: string;
  data: Record<string, unknown>;
}

/**
 * IP adresinin özel ağ (private IP), loopback veya Cloud Metadata IP adresi olup olmadığını denetler
 */
function isPrivateOrMetadataIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '0.0.0.0' || ip === '255.255.255.255' || ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  
  // 172.16.0.0 - 172.31.255.255
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (!isNaN(second) && second >= 16 && second <= 31) return true;
    }
  }
  return false;
}

/**
 * SSRF Engellemesi — Webhook URL'in Private IP, Metadata IP (169.254.169.254) veya yerel ağa işaret edip etmediğini kontrol eder
 */
export async function validateWebhookUrlSSRF(urlStr: string | null | undefined): Promise<void> {
  if (!urlStr || urlStr.trim() === '') return;

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error('Geçersiz Webhook URL formatı.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('SSRF Engellemesi: Webhook URL yalnızca http:// veya https:// protokolü kullanabilir.');
  }

  const hostname = parsed.hostname.toLowerCase();

  const forbiddenNames = ['localhost', 'metadata.google.internal', 'metadata.aws.internal'];
  if (forbiddenNames.includes(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.home')) {
    throw new Error('SSRF Güvenlik İhlali: Webhook URL yerel ağ veya metaveri sunucularına işaret edemez.');
  }

  if (isPrivateOrMetadataIp(hostname)) {
    throw new Error(`SSRF Güvenlik İhlali: Tanımlanan Webhook adresi (${hostname}) özel IP, yerel ağ veya metaveri (Metadata IP) aralığındadır!`);
  }

  // DNS Çözümleme (DNS Rebinding ve alan adı üzerinden özel IP hedeflemeyi engelleme)
  try {
    const lookupResult = await dns.lookup(hostname, { family: 4 });
    if (lookupResult && lookupResult.address) {
      if (isPrivateOrMetadataIp(lookupResult.address)) {
        throw new Error(`SSRF Güvenlik İhlali: Webhook alan adı (${hostname}) özel veya yerel bir IP adresine (${lookupResult.address}) çözümleniyor!`);
      }
    }
  } catch (err: any) {
    if (err && err.message && err.message.includes('SSRF Güvenlik İhlali')) {
      throw err;
    }
    if (err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN')) {
      throw new Error(`Webhook URL alan adı (${hostname}) çözümlenemedi (DNS bulunamadı).`);
    }
  }
}

/**
 * HMAC-SHA256 imzası oluşturur
 * Alıcı sistem imzayı doğrulayarak isteğin gerçekten Etiya Project'dan geldiğini anlar
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
  await validateWebhookUrlSSRF(url);
  const signature = generateWebhookSignature(payload);
  const body = JSON.stringify(payload);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Etiya Project-Signature': `sha256=${signature}`,
        'X-Etiya Project-Event': payload.event,
        'X-Etiya Project-Timestamp': payload.timestamp,
        'User-Agent': 'Etiya Project-Webhook/1.0',
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
