import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listAllProfiles,
  getPendingQrProfiles,
  getAdminProfileById,
  createAdminProfile,
  updateAdminProfile,
  deleteAdminProfile,
} from '../controllers/adminProfileController.js';

const router = Router();

// Protect all admin profile routes with auth + admin role
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/pending-qr', getPendingQrProfiles);
router.get('/', listAllProfiles);
router.post('/', createAdminProfile);
router.get('/:id', getAdminProfileById);
router.put('/:id', updateAdminProfile);
router.delete('/:id', deleteAdminProfile);

export default router;
