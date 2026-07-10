import { Request, Response } from 'express';
import { webhookDLQ, webhookQueue } from '../../jobs/queue';
import { NotFoundError } from '../../utils/errors';

/**
 * GET /api/v1/admin/webhook-dlq
 */
export async function getWebhookDLQ(req: Request, res: Response): Promise<void> {
  // BullMQ getJobs: 'waiting', 'active', 'completed', 'failed', 'delayed' vb.
  // DLQ'daki görevler genellikle 'waiting' veya 'delayed' (çünkü worker yok) veya 'active' olur.
  // DLQ için worker olmadığı için eklendiklerinde 'waiting' durumunda kalırlar.
  const jobs = await webhookDLQ.getJobs(['waiting', 'delayed']);
  
  const formattedJobs = jobs.map(job => ({
    id: job.id,
    name: job.name,
    data: job.data,
    timestamp: job.timestamp,
  }));

  res.status(200).json({ success: true, data: formattedJobs });
}

/**
 * POST /api/v1/admin/webhook-dlq/:jobId/retry
 */
export async function retryWebhookDLQJob(req: Request, res: Response): Promise<void> {
  const { jobId } = req.params;

  const job = await webhookDLQ.getJob(jobId);
  if (!job) {
    throw new NotFoundError('DLQ Job');
  }

  // Orijinal job verisini alıp ana webhook kuyruğuna yeniden atıyoruz
  const originalData = job.data.originalData;
  if (!originalData) {
    throw new NotFoundError('Orijinal job verisi bulunamadı');
  }

  // Ana kuyruğa ekle
  await webhookQueue.add('webhook-dispatch', originalData);

  // DLQ'dan sil
  await job.remove();

  res.status(200).json({ success: true, message: 'Webhook yeniden kuyruğa alındı.' });
}
