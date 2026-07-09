import { Client as MinioClient } from 'minio';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { InternalError } from '../utils/errors';

const minio = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const BUCKET = env.MINIO_BUCKET;

/**
 * Bucket'ın var olduğundan emin ol, yoksa oluştur
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    const exists = await minio.bucketExists(BUCKET);
    if (!exists) {
      await minio.makeBucket(BUCKET, 'us-east-1');
      logger.info(`MinIO bucket oluşturuldu: ${BUCKET}`);

      // Okuma politikası (public-read ile URL'den erişim)
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [
            `arn:aws:s3:::${BUCKET}/issues/*`,
            `arn:aws:s3:::${BUCKET}/avatars/*`,
          ],
        }],
      });
      await minio.setBucketPolicy(BUCKET, policy);
    }
  } catch (err) {
    logger.error('MinIO bucket kontrolü başarısız', err);
  }
}

/**
 * Görsel yükleme — işlenmiş buffer'ı MinIO'ya kaydeder
 */
export async function uploadImage(
  buffer: Buffer,
  contentType: string = 'image/webp',
): Promise<{ key: string; url: string }> {
  const key = `issues/${crypto.randomUUID()}/image.webp`;

  try {
    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      'Content-Type': contentType,
      'Cache-Control': 'max-age=31536000',
    });

    const url = `${env.MINIO_USE_SSL ? 'https' : 'http'}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${BUCKET}/${key}`;

    logger.debug('MinIO upload tamamlandı', { key, size: buffer.length });
    return { key, url };
  } catch (err) {
    logger.error('MinIO upload hatası', err);
    throw new InternalError('Görsel yüklenirken hata oluştu.');
  }
}

/**
 * Nesne güncelleme (blur sonrası)
 */
export async function updateObject(key: string, buffer: Buffer, contentType = 'image/webp'): Promise<void> {
  try {
    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  } catch (err) {
    logger.error('MinIO update hatası', { key, error: String(err) });
    throw new InternalError('Görsel güncellenirken hata oluştu.');
  }
}

/**
 * Nesne silme
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    await minio.removeObject(BUCKET, key);
  } catch (err) {
    logger.warn('MinIO silme hatası', { key, error: String(err) });
  }
}

/**
 * Geçici imzalı URL oluşturma (özel dosyalar için)
 */
export async function getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
  return minio.presignedGetObject(BUCKET, key, expirySeconds);
}

/**
 * Geçici görsel yükleme — işlenmeden önce MinIO'ya ham olarak kaydeder
 * Worker bu key'i alır, işler ve temp dosyayı siler
 */
export async function uploadTempImage(
  buffer: Buffer,
  mimeType: string,
  issueId: string,
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const key = `temp/${issueId}/raw.${ext}`;

  try {
    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      'Content-Type': mimeType,
      'X-Temp': 'true',
    });
    logger.debug('Geçici MinIO upload tamamlandı', { key, size: buffer.length });
    return key;
  } catch (err) {
    logger.error('Geçici MinIO upload hatası', err);
    throw new InternalError('Görsel geçici olarak yüklenirken hata oluştu.');
  }
}

export { minio };
