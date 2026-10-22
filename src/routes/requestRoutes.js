import { Router } from 'express';
import {
  listRequests,
  getRequestCounts,
  resolveRequest,
  rejectRequest,
  deleteRequest,
} from '../controllers/requestController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All activation request management routes require authentication
router.use(requireAuth);

router.get('/counts', getRequestCounts);
router.get('/', listRequests);
router.patch('/:id/resolve', resolveRequest);
router.patch('/:id/reject', rejectRequest);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), deleteRequest);

export default router;
