import multer from 'multer';
import FileType from 'file-type';
import { BadRequestError } from '../utils/errors';

// Desteklenen görsel formatları
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (Phase 2 FinOps and Security requirement)

/**
 * Bellek tabanlı upload — EXIF okuma ve Vision AI işlemi için
 * buffer'a ihtiyaç var, disk'e yazmadan önce işlenir
 */
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestError(
          `Desteklenmeyen dosya formatı: ${file.mimetype}. ` +
          `Desteklenen formatlar: JPEG, PNG, WebP, HEIC`,
        ),
      );
      return;
    }
    callback(null, true);
  },
}).single('image');

/**
 * Upload middleware'i promise wrapper ile async/await uyumlu hale getirir
 * Magic Bytes (file-type) kontrolü ile uzantı sahteciliğini engeller.
 */
export function handleUpload(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadSingle(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          reject(
            new BadRequestError(
              `Dosya boyutu çok büyük. Maksimum boyut: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            ),
          );
        } else {
          reject(new BadRequestError(`Dosya yükleme hatası: ${err.message}`));
        }
      } else if (err) {
        reject(err);
      } else {
        if (req.file) {
          try {
            const type = await FileType.fromBuffer(req.file.buffer);
            if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
              reject(
                new BadRequestError(
                  `Dosyanın gerçek içerik yapısı (magic bytes) desteklenmiyor veya sahte uzantı tespit edildi (${type?.mime || 'bilinmeyen tür'}).`,
                ),
              );
              return;
            }
          } catch (e) {
            reject(new BadRequestError(`Dosya bütünlük kontrolü hatası: ${(e as Error).message}`));
            return;
          }
        }
        resolve();
      }
    });
  });
}
