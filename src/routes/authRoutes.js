import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, updateProfile);
router.patch('/change-password', requireAuth, authLimiter, changePassword);

export default router;
