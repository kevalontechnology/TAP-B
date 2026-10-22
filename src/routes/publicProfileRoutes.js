import express from 'express';
import {
  getPublicProfileData,
  trackProfileView,
  trackLinkAndRedirect,
  submitContactLead,
  downloadPublicVcf,
} from '../controllers/publicProfileController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Profile & Tracking Endpoints
router.get('/profile/:username', getPublicProfileData);
router.post('/profile/:username/track-view', apiLimiter, trackProfileView);
router.post('/profile/:username/connect', apiLimiter, submitContactLead);
router.get('/profile/:username/vcf', downloadPublicVcf);

export default router;
