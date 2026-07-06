import ExifParser from 'exif-parser';
import { BadRequestError } from '../utils/errors';
import { haversineDistance, isWithinTurkey } from '../utils/spatial.utils';
import { logger } from '../utils/logger';

export interface ExifValidationResult {
  exifLatitude: number;
  exifLongitude: number;
  distanceMeters: number;
  isValid: boolean;
}

const MAX_DISTANCE_METERS = 50; // 50 metre sapma eşiği

/**
 * Fotoğrafın EXIF GPS verisini okur ve bildirilen koordinatla karşılaştırır
 */
export async function validateExifLocation(
  imageBuffer: Buffer,
  claimedLat: number,
  claimedLng: number,
): Promise<ExifValidationResult> {
  let exifData: any;

  try {
    const parser = ExifParser.create(imageBuffer);
    parser.enableSimpleValues(true);
    parser.enableTagNames(true);
    parser.enableImageSize(true);
    exifData = parser.parse();
  } catch (err) {
    logger.warn('EXIF parse hatası — EXIF verisi yok veya bozuk', { error: String(err) });
    throw new BadRequestError(
      'Fotoğrafın EXIF meta verisi okunamadı. ' +
      'Lütfen GPS konum verisi içeren bir fotoğraf yükleyin.',
    );
  }

  const { GPSLatitude, GPSLongitude } = exifData.tags || {};

  if (GPSLatitude == null || GPSLongitude == null) {
    throw new BadRequestError(
      'Fotoğraf GPS konum bilgisi içermiyor. ' +
      'Kamera uygulamanızda "Konum Erişimi"nin açık olduğundan emin olun.',
    );
  }

  const exifLat = Number(GPSLatitude);
  const exifLng = Number(GPSLongitude);

  // EXIF koordinatları Türkiye sınırları içinde mi?
  if (!isWithinTurkey(exifLat, exifLng)) {
    throw new BadRequestError(
      'Fotoğrafın GPS konumu Türkiye sınırları dışında. ' +
      'Lütfen Türkiye\'de çekilmiş bir fotoğraf yükleyin.',
    );
  }

  const distance = haversineDistance(
    { lat: claimedLat, lng: claimedLng },
    { lat: exifLat, lng: exifLng },
  );

  if (distance > MAX_DISTANCE_METERS) {
    logger.warn('EXIF GPS spoofing şüphesi', {
      claimedLat, claimedLng,
      exifLat, exifLng,
      distanceMeters: Math.round(distance),
    });

    throw new BadRequestError(
      `GPS doğrulama başarısız: Bildirilen konum ile fotoğraf konumu arasında ` +
      `${Math.round(distance)} metre fark var (maksimum: ${MAX_DISTANCE_METERS}m). ` +
      `Lütfen bildirilen konumda çekilmiş bir fotoğraf yükleyin.`,
    );
  }

  return {
    exifLatitude: exifLat,
    exifLongitude: exifLng,
    distanceMeters: distance,
    isValid: true,
  };
}
