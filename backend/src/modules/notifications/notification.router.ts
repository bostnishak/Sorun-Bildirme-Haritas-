import { Router } from 'express';
import * as notificationController from './notification.controller';
import { isAuthenticated } from '../../middleware/auth.middleware';

const router = Router();

router.use(isAuthenticated);

router.get('/', notificationController.getMyNotifications);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

export { router as notificationRouter };
