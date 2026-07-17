import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Google Vision Client — credentials JSON'dan başlatılır
let visionClient: ImageAnnotatorClient;

function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    if (env.GOOGLE_VISION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(env.GOOGLE_VISION_CREDENTIALS_JSON);
      visionClient = new ImageAnnotatorClient({ credentials });
    } else {
      // Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS env)
      visionClient = new ImageAnnotatorClient();
    }
  }
  return visionClient;
}

export interface BlurResult {
  buffer: Buffer;
  facesFound: number;
  platesFound: number;
  wasModified: boolean;
}

/**
 * Google Vision API ile yüz ve plaka tespiti yapıp bulanıklaştırır
 */
export async function blurSensitiveContent(imageBuffer: Buffer): Promise<BlurResult> {
  const client = getVisionClient();

  let faces: any[] = [];
  let allObjects: any[] = [];

  try {
    // Paralel olarak yüz ve nesne tespiti yap
    const [faceResult, objectResult] = await Promise.all([
      client.faceDetection({ image: { content: imageBuffer } }),
      client.objectLocalization!({ image: { content: imageBuffer } }),
    ]);

    faces = faceResult[0]?.faceAnnotations ?? [];
    allObjects = objectResult[0]?.localizedObjectAnnotations ?? [];
  } catch (error) {
    logger.error('Google Vision API hatası (kimlik doğrulama veya bağlantı). İşçi (worker) çökmesi engellendi. Resim sansürlenmeden devam edilecek.', { error: String(error) });
    return { buffer: imageBuffer, facesFound: 0, platesFound: 0, wasModified: false };
  }

  // Plaka tespiti — Google Vision "License plate" veya "Vehicle registration plate"
  const plates = allObjects.filter(
    (obj: any) =>
      obj.name?.toLowerCase().includes('license plate') ||
      obj.name?.toLowerCase().includes('vehicle registration'),
  );

  const facesFound = faces.length;
  const platesFound = plates.length;

  if (facesFound === 0 && platesFound === 0) {
    logger.debug('Vision AI: hassas içerik bulunamadı, blur uygulanmıyor');
    return { buffer: imageBuffer, facesFound: 0, platesFound: 0, wasModified: false };
  }

  logger.info('Vision AI: hassas içerik tespit edildi', { facesFound, platesFound });

  // Sharp ile görsel metadata al
  const metadata = await sharp(imageBuffer).metadata();
  const { width = 1, height = 1 } = metadata;

  // Her hassas bölgeyi pikselleştir (mozaik blur)
  type BlurRegion = { left: number; top: number; width: number; height: number };
  const regions: BlurRegion[] = [];

  for (const face of faces) {
    const vertices = face.boundingPoly?.vertices ?? [];
    if (vertices.length < 2) continue;
    const padding = 20;
    const minX = Math.max(0, Math.min(...vertices.map((v: any) => v.x ?? 0)) - padding);
    const minY = Math.max(0, Math.min(...vertices.map((v: any) => v.y ?? 0)) - padding);
    const maxX = Math.min(width, Math.max(...vertices.map((v: any) => v.x ?? 0)) + padding);
    const maxY = Math.min(height, Math.max(...vertices.map((v: any) => v.y ?? 0)) + padding);
    const w = maxX - minX;
    const h = maxY - minY;
    if (w > 0 && h > 0) regions.push({ left: Math.floor(minX), top: Math.floor(minY), width: Math.floor(w), height: Math.floor(h) });
  }

  for (const plate of plates) {
    const vertices = plate.boundingPoly?.normalizedVertices ?? [];
    if (vertices.length < 2) continue;
    const xs = vertices.map((v: any) => (v.x ?? 0) * width);
    const ys = vertices.map((v: any) => (v.y ?? 0) * height);
    const minX = Math.max(0, Math.min(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxX = Math.min(width, Math.max(...xs));
    const maxY = Math.min(height, Math.max(...ys));
    const w = maxX - minX;
    const h = maxY - minY;
    if (w > 0 && h > 0) regions.push({ left: Math.floor(minX), top: Math.floor(minY), width: Math.floor(w), height: Math.floor(h) });
  }

  // Her bölge için pikselleştirme uygula
  const MOSAIC_FACTOR = 10; // Bölünen blok boyutu (küçük = daha yüksek gizlilik)
  const compositeOps: sharp.OverlayOptions[] = [];

  for (const region of regions) {
    const blockW = Math.max(1, Math.floor(region.width / MOSAIC_FACTOR));
    const blockH = Math.max(1, Math.floor(region.height / MOSAIC_FACTOR));

    // Extract → küçük boyuta resize → orijinal boyuta geri resize (mozaik)
    const pixelated = await sharp(imageBuffer)
      .extract(region)
      .resize(blockW, blockH, { kernel: 'nearest' })
      .resize(region.width, region.height, { kernel: 'nearest' })
      .toBuffer();

    compositeOps.push({ input: pixelated, left: region.left, top: region.top });
  }

  const processedBuffer = await sharp(imageBuffer)
    .composite(compositeOps)
    .webp({ quality: 85 })
    .toBuffer();

  return {
    buffer: processedBuffer,
    facesFound,
    platesFound,
    wasModified: true,
  };
}
