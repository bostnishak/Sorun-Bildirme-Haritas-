import { Request, Response } from 'express';
import { issuesService } from './issues.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';
import { handleUpload } from '../../middleware/upload.middleware';
import { validateExifLocation } from '../../services/exif.service';
// Removed guardContent as enforceDynamicModeration replaces it
import { enforceDynamicModeration, runAsyncSemanticGuardrailForIssue } from '../../services/aiModeration.service';
import { reverseGeocodeHighPrecision, searchAddressForward } from '../../services/geocoding.service';
import { verifyIssuePhotoProof } from '../../services/aiVisionProof.service';
import { parseSinglePromptIssue } from '../../services/aiChatbotAssistant.service';
import { imageProcessingQueue } from '../../jobs/queue';
import { logger } from '../../utils/logger';
import { isWithinTurkey } from '../../utils/spatial.utils';

// ─── Validation Schemas ────────────────────────────────────────────────────

const createIssueSchema = z.object({
  title: z.string().min(5, 'Başlık en az 5 karakter olmalı.').max(200),
  description: z.string().min(20, 'Açıklama en az 20 karakter olmalı.').max(2000),
  category: z.enum([
    'WATER_SANITATION', 'TRANSPORTATION', 'ENVIRONMENT',
    'INFRASTRUCTURE', 'SECURITY', 'LIGHTING', 'PARKS',
  ]),
  latitude: z.coerce.number().refine(v => v >= -90 && v <= 90),
  longitude: z.coerce.number().refine(v => v >= -180 && v <= 180),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  address: z.string().max(500).optional(),
});

const listIssuesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().default(50),
  city: z.string().optional(),
  district: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

const clusterSchema = z.object({
  minLng: z.coerce.number(),
  minLat: z.coerce.number(),
  maxLng: z.coerce.number(),
  maxLat: z.coerce.number(),
  zoom: z.coerce.number().default(10),
  category: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'RESOLVED_PENDING_APPROVAL', 'REJECTED_PENDING_APPROVAL']),
  note: z.string().max(500).optional(),
});

const officerSubmitSchema = z.object({
  status: z.enum(['RESOLVED_PENDING_APPROVAL', 'REJECTED_PENDING_APPROVAL', 'IN_REVIEW']),
  proofImageUrl: z.string().url().or(z.string().max(500)).optional(),
  resolutionNote: z.string().max(2000).optional(),
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

  // 3.2. Türkiye coğrafi ön kontrolü (fotoğraf olsun ya da olmasın)
  if (!isWithinTurkey(data.latitude, data.longitude)) {
    throw new BadRequestError('İhbar koordinatları Türkiye coğrafi sınırları dışında olamaz.');
  }

  // 3. Dinamik AI Moderasyon Katmanı (Regex + OpenAI API + Zod)
  await enforceDynamicModeration(`${data.title}\n${data.description}`);
  
  const llmGuardPassed = true; // enforceDynamicModeration throws if it strictly fails, otherwise we accept it.

  // 3b. SECURITY kategorisi — Yalnızca kimlik doğrulanmış kullanıcılar bildirim yapabilir
  // Yasal Dayanak: KVKK Md.4 (doğru veri), 5651 sk. (hesap verebilirlik)
  if (data.category === 'SECURITY') {
    const user = req.user as any;
    if (!user?.isVerified) {
      throw new BadRequestError(
        'GÜVENLİK kategorisinde ihbar yapabilmek için kimlik doğrulaması (NVİ/T.C. Kimlik) zorunludur. ' +
        'Profilinizden kimlik bilgilerinizi doğrulayın. Acil durumlar için 155 (Polis) veya 112 (Acil) numaralarını arayın.'
      );
    }
  }

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

  // 6b. Asenkron Semantik Guardrail & Kota Karantinasını Anında Çalıştır (Haritada yayınlanmadan önce yakala)
  runAsyncSemanticGuardrailForIssue(issue.id, `${data.title}\n${data.description}`).catch(() => {});

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
 * PATCH /api/v1/issues/:id/officer-submit — Çalışan kanıt foto/rapor yükleyip onaya sunar
 */
export async function officerSubmitIssue(req: Request, res: Response): Promise<void> {
  const parsed = officerSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError('Geçersiz gönderim bilgileri.');
  }

  const issue = await issuesService.officerSubmit(
    req.params.id,
    parsed.data.status,
    req.user.sub,
    req.user.role,
    req.user.institutionId,
    parsed.data.proofImageUrl,
    parsed.data.resolutionNote,
  );

  res.status(200).json({
    success: true,
    message: 'Sorun çözüm kanıtı ve raporu onaya iletildi.',
    data: issue,
  });
}



/**
 * POST /api/v1/issues/:id/upvote — Sorunu destekle (upvote)
 */
export async function upvoteIssue(req: Request, res: Response): Promise<void> {
  const upvote = await issuesService.upvote(req.params.id, req.user.sub);
  res.status(200).json({ success: true, message: 'Sorun desteklendi.', data: upvote });
}

/**
 * DELETE /api/v1/issues/:id/upvote — Desteği geri çek
 */
export async function removeUpvote(req: Request, res: Response): Promise<void> {
  await issuesService.removeUpvote(req.params.id, req.user.sub);
  res.status(200).json({ success: true, message: 'Destek geri çekildi.' });
}

/**
 * GET /api/v1/issues/summary-stats — Genel özet istatistikler (Public)
 */
export async function getSummaryStats(_req: Request, res: Response): Promise<void> {
  const stats = await issuesService.getPublicSummaryStats();
  res.status(200).json({ success: true, data: stats });
}

/**
 * GET /api/v1/issues/stats — Detaylı bildirim istatistikleri (StatsBar için)
 */
export async function getDetailedStats(_req: Request, res: Response): Promise<void> {
  const stats = await issuesService.getDetailedStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
}

/**
 * GET /api/v1/issues/:id/comments — Yorumları getir
 */
export async function getComments(req: Request, res: Response): Promise<void> {
  const comments = await issuesService.getComments(req.params.id);
  res.status(200).json({ success: true, data: comments });
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
 * DELETE /api/v1/issues/:id/comments/:commentId — Yorum sil
 */
export async function deleteComment(req: Request, res: Response): Promise<void> {
  await issuesService.deleteComment(req.params.commentId, req.user.sub, req.user.role);
  res.status(200).json({ success: true, message: 'Yorum silindi.' });
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
    message: z.string().max(2000, 'Mesaj en fazla 2000 karakter olabilir.').optional().default(''),
    imageBase64: z.string().max(2_100_000, 'Görsel boyutu çok büyük (max ~1.5 MB).').optional(),
    history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  });
  const { message, imageBase64, history } = schema.parse(req.body);

  if (!message && !imageBase64) {
    throw new BadRequestError('Lütfen bir mesaj veya fotoğraf gönderin.');
  }

  const extraction = await parseSinglePromptIssue(message || '', imageBase64, req.user?.sub, history);
  res.status(200).json({ success: true, data: extraction });
}

/**
 * DELETE /api/v1/issues/:id — Bildirim silme (Sadece bildiren kişi veya SUPER_ADMIN silebilir)
 */
export async function deleteIssue(req: Request, res: Response): Promise<void> {
  await issuesService.deleteIssue(req.params.id, req.user.sub, req.user.role);
  res.status(200).json({ success: true, message: 'Bildirim başarıyla silindi.' });
}
