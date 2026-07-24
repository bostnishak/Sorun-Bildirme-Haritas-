import { Request, Response } from 'express';
import { getPresignedUrl } from '../../services/storage.service';
import { NotFoundError } from '../../utils/errors';

/**
 * GET /api/v1/media/view/*
 * 
 * Güvenli MinIO Proxy'si (SORUN-15).
 * MinIO'daki dosyalar private olduğu için frontend bu endpoint'e istek atar.
 * Backend anlık olarak geçici bir "presigned URL" üretip 302 yönlendirmesi yapar.
 * Böylece bucket dış dünyaya kapalı kalırken, medya dosyaları güvenle sunulur.
 */
export async function viewMedia(req: Request, res: Response): Promise<void> {
  const key = req.params[0]; // '*' wildcard'ından gelen tüm path'i yakalar (örn: "issues/uuid/image.webp")
  
  if (!key) {
    throw new NotFoundError('Medya anahtarı belirtilmedi.');
  }

  try {
    // 1 saat (3600 sn) geçerli geçici URL üret (storage.service'den)
    const presignedUrl = await getPresignedUrl(key, 3600);
    
    // Geçici URL'ye 302 yönlendir
    res.redirect(302, presignedUrl);
  } catch (err) {
    throw new NotFoundError('Medya dosyası bulunamadı veya erişilemiyor.');
  }
}
