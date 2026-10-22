import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllUserLeads,
  getLeadDetails,
  updateLeadStatus,
  exportLeads,
} from '../controllers/leadController.js';

const router = express.Router();

router.get('/', requireAuth, getAllUserLeads);
router.get('/export', requireAuth, exportLeads);
router.get('/:leadId', requireAuth, getLeadDetails);
router.patch('/:leadId/status', requireAuth, updateLeadStatus);

export default router;
