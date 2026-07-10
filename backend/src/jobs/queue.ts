import { Queue, QueueOptions } from 'bullmq';
import { redis } from '../config/redis';

const defaultQueueOptions: QueueOptions = {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 3600 },
    removeOnFail: { count: 200, age: 86400 },
  },
};

/**
 * Görsel işleme kuyruğu
 * Job: Vision AI blur + MinIO upload
 */
export const imageProcessingQueue = new Queue('image-processing', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

/**
 * Webhook gönderme kuyruğu
 * Job: Kurum API'sine HMAC imzalı bildirim
 */
export const webhookQueue = new Queue('webhook-dispatch', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s, 40s, 80s
    removeOnComplete: 100,
    removeOnFail: false, // Başarısız webhook'ları sakla
  },
});

// Dead Letter Queue
export const webhookDLQ = new Queue('webhook-dlq', {
  connection: redis as any,
});

/**
 * Bildirim gönderme kuyruğu
 * Job: Push notification/SMS/Email
 */
export const notificationQueue = new Queue('notification-queue', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

/**
 * Rapor üretme kuyruğu
 * Job: PDF üretimi + e-posta gönderimi
 */
export const reportQueue = new Queue('report-generation', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
  },
});

export const allQueues = [imageProcessingQueue, webhookQueue, reportQueue, notificationQueue];
