import { Router } from 'express';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
} from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

router.get('/', listNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', removeNotification);

export default router;
