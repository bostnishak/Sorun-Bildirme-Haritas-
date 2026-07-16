import { Request, Response } from 'express';
import { notificationService } from '../../services/notification.service';
import { z } from 'zod';
import { BadRequestError } from '../../utils/errors';

export async function getMyNotifications(req: Request, res: Response): Promise<void> {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const unreadOnly = req.query.unreadOnly === 'true';

  const data = await notificationService.getUserNotifications(req.user.sub, limit, unreadOnly);
  res.status(200).json({ success: true, data });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    notificationId: z.string().uuid('Geçerli bir bildirim ID girilmelidir.'),
  });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.errors.map(e => e.message).join(', '));
  }

  const updated = await notificationService.markAsRead(parsed.data.notificationId, req.user.sub);
  res.status(200).json({ success: true, data: updated });
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  await notificationService.markAllAsRead(req.user.sub);
  res.status(200).json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi.' });
}
