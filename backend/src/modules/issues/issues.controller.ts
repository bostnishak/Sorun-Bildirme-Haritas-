import { Request, Response } from 'express';
import { issuesService } from './issues.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';
import { handleUpload } from '../../middleware/upload.middleware';
import { validateExifLocation } from '../../services/exif.service';
import { guardContent } from '../../services/llm.service';
import { enforceDynamicModeration } from '../../services/aiModeration.service';
import { reverseGeocodeHighPrecision, searchAddressForward } from '../../services/geocoding.service';
import { verifyIssuePhotoProof } from '../../services/aiVisionProof.service';
import { parseSinglePromptIssue } from '../../services/aiChatbotAssistant.service';
import { imageProcessingQueue } from '../../jobs/queue';
import { logger } from '../../utils/logger';

// ─── Validation Schemas ────────────────────────────────────────────────────

const createIssueSchema = z.object({
  title: z.string().min(5, 'Başlık en az 5 karakter olmalı.').max(200),
  description: z.string().min(20, 'Açıklama en az 20 karakter olmalı.').max(2000),
  category: z.enum([
    'WATER_SANITATION', 'TRANSPORTATION', 'ENVIRONMENT',
    'INFRASTRUCTURE', 'SECURITY', 'LIGHTING', 'PARKS',
  ]),
  latitude: z.string().transform(Number).refine(v => v >= -90 && v <= 90),
  longitude: z.string().transform(Number).refine(v => v >= -180 && v <= 180),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  address: z.string().max(500).optional(),
});

const listIssuesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().default('50').transform(Number),
  city: z.string().optional(),
  district: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

const clusterSchema = z.object({
  minLng: z.string().transform(Number),
  minLat: z.string().transform(Number),
  maxLng: z.string().transform(Number),
  maxLat: z.string().transform(Number),
  zoom: z.string().default('10').transform(Number),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED']),
  note: z.string().max(500).optional(),
});

// ─── Controllers ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/issues — Yeni sorun oluştur
 * Middleware zinciri: isAuthenticated → issueCreateRateLimit → bu controller
 */
export async function createIssue(req: Request, res: Response): Promise<void> {
  // 1. Dosya upload
  await handleUpload(req, res);

  // 2. Body validasyonu
  const parsed = createIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map(e => e.message).join(', '));
  }
  const data = parsed.data;

  // 3. Dinamik AI Moderasyon Katmanı + LLM Guard
  await enforceDynamicModeration(`${data.title}\n${data.description}`);
  const llmResult = await guardContent(data.title, data.description);
  const llmGuardPassed = llmResult.valid;

  // 4. EXIF doğrulama (fotoğraf varsa)
  let exifResult = null;
  if (req.file) {
    exifResult = await validateExifLocation(
      req.file.buffer,
      data.latitude,
      data.longitude,
    );

    // Bilgisayarlı Görü ile Fotoğrafın Kategori ve Açıklamayla Uyumunu Anlık Denetle
    const base64Img = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
    const visionProof = await verifyIssuePhotoProof(
      base64Img,
      data.category,
      data.title,
      data.description,
    );
    if (!visionProof.valid || (visionProof.confidenceScore && visionProof.confidenceScore < 0.65)) {
      throw new BadRequestError(
        visionProof.userFriendlyMessage ||
        visionProof.reason ||
        'Yüklediğiniz fotoğraf seçilen sorun türüyle eşleşmiyor! Lütfen geçerli bir kanıt fotoğrafı yükleyin.'
      );
    }
  }

  // 5. IP adresi
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown';

  // 6. Sorun oluştur (önce fotoğrafsız, async olarak işlenecek)
  const issue = await issuesService.create({
    ...data,
    reportedById: req.user.sub,
    ipAddress,
    userAgent: req.headers['user-agent'],
    exifLatitude: exifResult?.exifLatitude,
    exifLongitude: exifResult?.exifLongitude,
    exifVerified: !!exifResult,
    exifDistance: exifResult?.distanceMeters,
    llmGuardPassed, // Gerçek LLM sonucu kaydediliyor
  });

  // 7. Görsel işleme kuyruguğuna ekle
  // Güvenlik: Buffer Base64 olarak Redis'e yazılmıyor;
  // Geçici MinIO key ile çalışılır (belleği korur)
  if (req.file) {
    const { uploadTempImage } = await import('../../services/storage.service');
    const tempKey = await uploadTempImage(
      req.file.buffer,
      req.file.mimetype,
      issue.id,
    );
    await imageProcessingQueue.add('process-image', {
      issueId: issue.id,
      tempImageKey: tempKey, // Base64 değil, sadece MinIO key
      mimeType: req.file.mimetype,
    });
    logger.info('Görsel işleme kuyruguğuna eklendi', { issueId: issue.id, tempKey });
  }

  res.status(201).json({
    success: true,
    message: 'Sorun bildirimi alındı. Görsel işleme tamamlandığında fotoğraf eklenecek.',
    data: issue,
  });
}

/**
 * GET /api/v1/issues/map-cluster — Harita küme verisi
 */
export async function getClusteredIssues(req: Request, res: Response): Promise<void> {
  const parsed = clusterSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz bounding box parametreleri.');
  }

  const clusters = await issuesService.getMapClusters(parsed.data);

  res.status(200).json({
    success: true,
    data: clusters,
    meta: { count: clusters.length, timestamp: new Date().toISOString() },
  });
}

/**
 * GET /api/v1/issues — Sayfalı liste
 */
export async function listIssues(req: Request, res: Response): Promise<void> {
  const parsed = listIssuesSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz filtre parametreleri.');
  }

  const result = await issuesService.list(parsed.data);

  res.status(200).json({
    success: true,
    data: result.issues,
    meta: {
      nextCursor: result.nextCursor,
      total: result.total,
      limit: parsed.data.limit,
    },
  });
}

/**
 * GET /api/v1/issues/:id — Sorun detayı
 */
export async function getIssue(req: Request, res: Response): Promise<void> {
  const issue = await issuesService.getById(req.params.id);
  res.status(200).json({ success: true, data: issue });
}

/**
 * PATCH /api/v1/issues/:id/status — Durum güncelle
 * Sadece INSTITUTION_OFFICER ve SUPER_ADMIN
 */
export async function updateIssueStatus(req: Request, res: Response): Promise<void> {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz durum değeri.');
  }

  const issue = await issuesService.updateStatus(
    req.params.id,
    parsed.data.status,
    req.user.sub,
    req.user.role,
    req.user.institutionId,
    parsed.data.note,
  );

  res.status(200).json({
    success: true,
    message: 'Sorun durumu güncellendi.',
    data: issue,
  });
}

/**
 * DELETE /api/v1/issues/:id — Sorun sil (sadece SUPER_ADMIN)
 */
export async function deleteIssue(req: Request, res: Response): Promise<void> {
  await issuesService.delete(req.params.id);
  res.status(200).json({ success: true, message: 'Sorun silindi.' });
}

/**
 * POST /api/v1/issues/:id/upvote — Sorunu destekle (upvote)
 */
export async function upvoteIssue(req: Request, res: Response): Promise<void> {
  const upvote = await issuesService.upvote(req.params.id, req.user.sub);
  res.status(200).json({ success: true, message: 'Sorun desteklendi.', data: upvote });
}

/**
 * GET /api/v1/issues/summary-stats — Genel özet istatistikler (Public)
 */
export async function getSummaryStats(_req: Request, res: Response): Promise<void> {
  const stats = await issuesService.getPublicSummaryStats();
  res.status(200).json({ success: true, data: stats });
}

/**
 * POST /api/v1/issues/:id/comments — Yorum ekle
 */
export async function addComment(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    content: z.string().min(2, 'Yorum en az 2 karakter olmalı.').max(1000),
  });
  const { content } = schema.parse(req.body);

  const comment = await issuesService.addComment(req.params.id, req.user.sub, content, req.user.role);
  res.status(201).json({ success: true, message: 'Yorum eklendi.', data: comment });
}

/**
 * GET /api/v1/issues/my/list — Vatandaşın kendi bildirimleri
 */
export async function getMyIssues(req: Request, res: Response): Promise<void> {
  const issues = await issuesService.listMyIssues(req.user.sub);
  res.status(200).json({ success: true, data: issues });
}

/**
 * GET /api/v1/issues/geocode?lat=39.9&lng=32.8 — Yüksek Hassasiyetli Tersine Konum Bulma
 */
export async function reverseGeocodeAddress(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    lat: z.string().transform(Number).refine(v => v >= -90 && v <= 90, 'Geçersiz enlem'),
    lng: z.string().transform(Number).refine(v => v >= -180 && v <= 180, 'Geçersiz boylam'),
  });
  const { lat, lng } = schema.parse(req.query);

  const address = await reverseGeocodeHighPrecision(lat, lng);
  res.status(200).json({ success: true, data: address });
}

/**
 * GET /api/v1/issues/geocode/forward?q=Gündoğumu Sokak No: 8/1 — İleri Yönde Adresten Koordinat Bulma
 */
export async function forwardGeocodeAddress(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    q: z.string().min(2, 'Adres sorgusu en az 2 karakter olmalı.'),
  });
  const { q } = schema.parse(req.query);

  const result = await searchAddressForward(q);
  res.status(200).json({ success: true, data: result });
}

/**
 * POST /api/v1/issues/verify-vision — Bilgisayarlı Görü ile Kanıt Doğrulama
 */
export async function verifyPhotoProof(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    imageUrl: z.string().min(1, 'Görsel URL veya Base64 zorunlu'),
    category: z.string().optional().default('ENVIRONMENT'),
    title: z.string().optional().default('Genel İhbar'),
    description: z.string().optional().default('Anlık fotoğraf doğrulama'),
  });
  const { imageUrl, category, title, description } = schema.parse(req.body);

  const result = await verifyIssuePhotoProof(imageUrl, category, title, description);
  res.status(200).json({ success: true, data: result });
}

/**
 * POST /api/v1/issues/ai-assistant — Tek İstemli (Single-Prompt) AI Chatbot Asistanı
 */
export async function assistantSinglePrompt(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    message: z.string().optional().default(''),
    imageBase64: z.string().optional(),
  });
  const { message, imageBase64 } = schema.parse(req.body);

  if (!message && !imageBase64) {
    throw new BadRequestError('Lütfen bir mesaj veya fotoğraf gönderin.');
  }

  const extraction = await parseSinglePromptIssue(message || '', imageBase64);
  res.status(200).json({ success: true, data: extraction });
}
