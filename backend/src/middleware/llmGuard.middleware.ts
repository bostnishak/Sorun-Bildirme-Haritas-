import { Request, Response, NextFunction } from 'express';
import { guardContent } from '../services/llm.service';
import { logger } from '../utils/logger';

/**
 * LLM Guard middleware — POST /api/v1/issues için
 * İsteği veritabanına ulaşmadan önce AI ile denetler
 */
export async function llmGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const { title, description } = req.body;

  if (!title || !description) {
    next();
    return;
  }

  logger.debug('LLM Guard: içerik denetimi başlıyor', { title: title.substring(0, 50) });

  const startTime = Date.now();
  await guardContent(title, description);
  
  logger.debug('LLM Guard: içerik geçti', {
    duration: `${Date.now() - startTime}ms`,
  });

  next();
}
