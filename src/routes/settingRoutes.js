import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getActiveBaseUrl, setActiveBaseUrl } from '../utils/baseUrlHelper.js';
import { logAuditAction } from '../services/auditService.js';

const router = express.Router();

/**
 * GET /api/settings/base-url
 * Get current configured Short URL Base URL
 */
router.get('/base-url', async (req, res, next) => {
  try {
    const baseUrl = await getActiveBaseUrl(req);
    return res.status(200).json({
      success: true,
      data: {
        baseUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings/base-url
 * Update Short URL Base URL (Admin/Super Admin only)
 */
router.put('/base-url', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const { baseUrl } = req.body;
    if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Base URL is required',
      });
    }

    const oldBaseUrl = await getActiveBaseUrl(req);
    const updatedUrl = await setActiveBaseUrl(baseUrl, req.user?._id);

    await logAuditAction({
      action: 'BASE_URL_UPDATED',
      oldValue: { baseUrl: oldBaseUrl },
      newValue: { baseUrl: updatedUrl },
      performedBy: req.user?._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Base URL updated successfully',
      data: {
        baseUrl: updatedUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
