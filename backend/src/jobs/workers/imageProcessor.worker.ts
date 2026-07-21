import { Worker, Job } from 'bullmq';
import { Readable } from 'stream';
import { redis } from '../../config/redis';
import { blurSensitiveContent } from '../../services/vision.service';
import { uploadImage, deleteObject, minio } from '../../services/storage.service';
import { analyzeImageContent } from '../../services/llm.service';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

interface ImageProcessingJobData {
  issueId: string;
  tempImageKey: string; // MinIO object key — Base64 artık kullanılmıyor
  mimeType: string;
}

/**
 * MinIO'dan stream olarak buffer oku
 */
async function downloadFromMinio(key: string): Promise<Buffer> {
  const stream = await minio.getObject(env.MINIO_BUCKET, key);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export const imageProcessorWorker = new Worker<ImageProcessingJobData>(
  'image-processing',
  async (job: Job<ImageProcessingJobData>) => {
    const { issueId, tempImageKey } = job.data;

    logger.info(`[ImageWorker] İşleniyor: ${issueId}`, { tempImageKey });

    // MinIO'dan geçici görsel indir
    const buffer = await downloadFromMinio(tempImageKey);

    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    // Google Vision AI ile hassas içerik blur'u
    const blurResult = await blurSensitiveContent(buffer);

    logger.info(`[ImageWorker] Blur tamamlandı`, {
      issueId,
      facesFound: blurResult.facesFound,
      platesFound: blurResult.platesFound,
      wasModified: blurResult.wasModified,
    });

    // OpenAI Vision AI ile görsel doğrulama
    // Gizlilik için blur edilmiş versiyonu gönderiyoruz
    const aiAnalysis = await analyzeImageContent(
      blurResult.buffer,
      job.data.mimeType,
      issue.title,
      issue.description,
      issue.category
    );

    const newStatus = aiAnalysis.valid ? 'OPEN' : 'REJECTED';
    
    if (aiAnalysis.valid) {
      logger.info(`[ImageWorker] AI görseli ONAYLADI -> OPEN`);
    } else {
      logger.warn(`[ImageWorker] AI görseli REDDETTİ -> REJECTED`, { reason: aiAnalysis.reason });
    }

    // İşlenmiş görsel kalıcı konuma yükle
    const { key, url } = await uploadImage(blurResult.buffer, 'image/webp');

    // DB güncelle
    await prisma.issue.update({
      where: { id: issueId },
      data: {
        imageKey: key,
        imageUrl: url,
        imageBlurred: blurResult.wasModified,
        imageProcessed: true,
        status: newStatus,
        llmGuardPassed: issue.llmGuardPassed && aiAnalysis.valid,
        llmGuardReason: aiAnalysis.reason,
      },
    });

    // İşlem bittikten sonra Redis'e publish et (socket io için):
    await redis.publish('image-processed', JSON.stringify({
      issueId,
      userId: issue.reportedById || (issue as any).userId,
      key,
      url,
      status: newStatus,
      blurred: blurResult.wasModified,
    }));

    await deleteObject(tempImageKey);
    logger.debug(`[ImageWorker] Geçici dosya silindi: ${tempImageKey}`);

    logger.info(`[ImageWorker] Tamamlandı: ${issueId}`, { key, url });

    return { issueId, key, url, blurred: blurResult.wasModified };
  },
  {
    connection: redis as any,
    concurrency: 2, // Aynı anda max 2 görsel işlensin
    limiter: {
      max: 10,
      duration: 60000, // Dakikada max 10 görsel (Google Vision kotası)
    },
  },
);

imageProcessorWorker.on('completed', (job) => {
  logger.debug(`[ImageWorker] Job tamamlandı: ${job.id}`);
});

imageProcessorWorker.on('failed', (job, err) => {
  logger.error(`[ImageWorker] Job başarısız: ${job?.id}`, { error: err.message });
});


