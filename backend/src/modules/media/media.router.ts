import { Router } from 'express';
import { viewMedia } from './media.controller';

const router = Router();

// Wildcard ile tüm path'i yakalıyoruz (örn: GET /api/v1/media/view/issues/123/image.webp)
router.get('/view/*', viewMedia);

export const mediaRouter = router;
