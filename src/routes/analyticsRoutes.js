import { Router } from 'express';
import { getDashboard, exportScanLogsCsv } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/dashboard', getDashboard);
router.get('/logs/export', exportScanLogsCsv);

export default router;
