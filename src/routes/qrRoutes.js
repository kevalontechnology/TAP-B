import { Router } from 'express';
import {
  create,
  createBulk,
  list,
  getById,
  update,
  updateDestinationHandler,
  assignHandler,
  updateStatusHandler,
  deleteQr,
  downloadSingle,
  downloadBatchZip,
  downloadBatchCsv,
  exportAllCsv,
  listBatches,
  getAuditHistory,
} from '../controllers/qrController.js';
import { getQrAnalytics } from '../controllers/analyticsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadLogo } from '../middleware/upload.js';

const router = Router();

// 1. PUBLIC DOWNLOAD & IMAGE ENDPOINTS
// QR images and single PNG/SVG downloads must be publicly accessible so <img src="..."> tags
// and direct browser download links work seamlessly without requiring a Bearer header.
router.get('/:id/download', downloadSingle);

// 2. PROTECTED MANAGEMENT ENDPOINTS
router.use(requireAuth);

// Batches & bulk actions
router.post('/bulk', requireRole(['SUPER_ADMIN', 'ADMIN']), createBulk);
router.get('/batches', listBatches);
router.get('/batches/:batchId/download', downloadBatchZip);
router.get('/batches/:batchId/csv', downloadBatchCsv);
router.get('/export', exportAllCsv);

// Logo upload
router.post('/upload-logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No logo file provided' });
  }
  const logoUrl = `/uploads/${req.file.filename}`;
  return res.status(200).json({ success: true, logoUrl });
});

// Single QR management
router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.patch('/:id', update);
router.patch('/:id/destination', updateDestinationHandler);
router.patch('/:id/assign', assignHandler);
router.patch('/:id/status', updateStatusHandler);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), deleteQr);

// QR history & analytics
router.get('/:id/history', getAuditHistory);
router.get('/:id/analytics', getQrAnalytics);

export default router;
