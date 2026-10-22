import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  toggleStatus,
  resetStatistics,
  deleteProfile,
  getProfileQr,
  getProfileVcf,
} from '../controllers/profileController.js';
import {
  getProfileStatistics,
  getLinkStatistics,
  getProfileActivity,
} from '../controllers/analyticsProfileController.js';
import { getProfileLeads } from '../controllers/leadController.js';

const router = express.Router();

// Profile CRUD (Auth required)
router.get('/', requireAuth, listProfiles);
router.post('/', requireAuth, createProfile);
router.get('/:id', requireAuth, getProfileById);
router.put('/:id', requireAuth, updateProfile);
router.patch('/:id/status', requireAuth, toggleStatus);
router.post('/:id/reset-stats', requireAuth, resetStatistics);
router.delete('/:id', requireAuth, deleteProfile);

// Share Assets
router.get('/:id/qr', requireAuth, getProfileQr);
router.get('/:id/vcf', requireAuth, getProfileVcf);

// Analytics & Activity
router.get('/:id/statistics', requireAuth, getProfileStatistics);
router.get('/:id/links/:platform/statistics', requireAuth, getLinkStatistics);
router.get('/:id/activity', requireAuth, getProfileActivity);

// Consented Leads
router.get('/:id/leads', requireAuth, getProfileLeads);

export default router;
