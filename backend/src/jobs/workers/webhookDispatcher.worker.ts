import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { webhookDLQ } from '../queue';
import { prisma } from '../../config/database';
import { dispatchWebhook, buildIssueCreatedPayload, buildStatusChangedPayload } from '../../services/webhook.service';
import { logger } from '../../utils/logger';
import { Priority } from '@prisma/client';

interface WebhookJobData {
  issueId: string;
  newStatus?: string;
  previousStatus?: string;
}

export const webhookDispatcherWorker = new Worker<WebhookJobData>(
  'webhook-dispatch',
  async (job: Job<WebhookJobData>) => {
    const { issueId, newStatus, previousStatus } = job.data;
    const isStatusChange = !!newStatus;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true, title: true, category: true,
        priority: true, status: true, city: true, district: true,
        latitude: true, longitude: true, address: true,
        createdAt: true, updatedAt: true,
      },
    });

    if (!issue) {
      logger.warn(`[WebhookWorker] Sorun bulunamadı: ${issueId}`);
      return;
    }

    // Sadece HIGH veya CRITICAL öncelikli sorunlar için webhook
    const highPriorities: Priority[] = [Priority.HIGH, Priority.CRITICAL];
    const isHighPriority = highPriorities.includes(issue.priority);

    if (isStatusChange && !isHighPriority) {
      logger.debug(`[WebhookWorker] Düşük öncelikli sorun atlandı: ${issueId}`);
      return;
    }

    // Sorumlu kurumu bul (PostGIS)
    const institution = await prisma.$queryRaw<any[]>`
      SELECT id, name, webhook_url as "webhookUrl", email_address as "emailAddress"
      FROM institutions
      WHERE
        (boundary IS NULL OR ST_Within(
          ST_SetSRID(ST_MakePoint(${issue.longitude}, ${issue.latitude}), 4326),
          boundary
        ))
        AND is_active = true
        AND webhook_url IS NOT NULL
      LIMIT 1
    `;

    if (!institution[0]?.webhookUrl) {
      logger.debug(`[WebhookWorker] Webhook URL bulunamadı: ${issue.city}/${issue.district}`);
      return;
    }

    const { webhookUrl } = institution[0];

    // Payload oluştur
    const payload = isStatusChange
      ? buildStatusChangedPayload(issue, previousStatus!)
      : buildIssueCreatedPayload(issue);

    // Gönder
    await dispatchWebhook(webhookUrl, payload);

    logger.info(`[WebhookWorker] Webhook gönderildi`, {
      issueId,
      event: payload.event,
      webhookUrl,
    });
  },
  {
    connection: redis as any,
    concurrency: 5,
  },
);

webhookDispatcherWorker.on('failed', async (job, err) => {
  logger.error(`[WebhookWorker] Job başarısız: ${job?.id}`, {
    error: err.message,
    attempts: job?.attemptsMade,
  });

  if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
    logger.warn(`[WebhookWorker] Webhook DLQ'ya taşınıyor: ${job.id}`);
    await webhookDLQ.add('dlq-webhook', {
      originalJobId: job.id,
      originalData: job.data,
      error: err.message,
      failedAt: new Date().toISOString(),
    });
  }
});
