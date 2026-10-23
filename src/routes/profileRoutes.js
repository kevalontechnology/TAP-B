import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadMedia } from '../middleware/upload.js';
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
  lookupCompanyByCode,
  getMyCards,
  addCardToProfile,
  toggleCardStatus,
  linkQrToCard,
  getNfcPayload,
} from '../controllers/profileController.js';
import {
  getProfileStatistics,
  getLinkStatistics,
  getProfileActivity,
} from '../controllers/analyticsProfileController.js';
import { getProfileLeads } from '../controllers/leadController.js';

const router = express.Router();

// File Upload for Profiles (Photos, Logos, Gallery Images, PDF Brochure)
router.post('/upload', requireAuth, uploadMedia.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    url: fullUrl,
    relativeUrl: fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
});

// Explicit User Application Routes (/my, /my/:id, and /my-cards must be defined BEFORE /:id)
router.get('/my', requireAuth, listProfiles);
router.get('/my-cards', requireAuth, getMyCards);
router.get('/my/:id', requireAuth, getProfileById);

// Card Actions (Add Card, Toggle Status, Link QR, NFC Payload)
router.post('/:id/add-card', requireAuth, addCardToProfile);
router.patch('/:id/toggle-card', requireAuth, toggleCardStatus);
router.post('/:id/link-qr', requireAuth, linkQrToCard);
router.get('/:id/nfc', requireAuth, getNfcPayload);

// Company Code lookup for Employee profile auto-fill
router.get('/company-lookup/:code', requireAuth, lookupCompanyByCode);

// General Profile CRUD (Auth required)
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
