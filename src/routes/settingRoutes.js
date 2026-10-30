import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getActiveBaseUrl,
  setActiveBaseUrl,
  getActiveProfileBaseUrl,
  setActiveProfileBaseUrl,
} from '../utils/baseUrlHelper.js';
import { logAuditAction } from '../services/auditService.js';
import { config } from '../config/env.js';

const router = express.Router();

/**
 * GET /api/settings/public-config
 * Public configuration endpoint for mobile and web clients
 */
router.get('/public-config', async (req, res, next) => {
  try {
    const profileBaseUrl = await getActiveProfileBaseUrl(req);
    const qrBaseUrl = await getActiveBaseUrl(req);

    return res.status(200).json({
      success: true,
      data: {
        profileBaseUrl,
        qrBaseUrl,
        brandColor: '#034665',
        companyName: 'Kevalon One',
        supportPhone: config.supportPhone || '+91 98765 43210',
        supportEmail: config.supportEmail || 'support@kevalon.com',
        supportWhatsApp: config.supportWhatsApp || '+919876543210',
      },
    });
  } catch (err) {
    next(err);
  }
});

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

/**
 * GET /api/settings/profile-base-url & /api/settings/profile-url
 * Get current configured Public Profile Base URL
 */
const getProfileBaseUrlHandler = async (req, res, next) => {
  try {
    const profileBaseUrl = await getActiveProfileBaseUrl(req);
    return res.status(200).json({
      success: true,
      data: {
        profileBaseUrl,
        baseUrl: profileBaseUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};
router.get('/profile-base-url', getProfileBaseUrlHandler);
router.get('/profile-url', getProfileBaseUrlHandler);

/**
 * PUT /api/settings/profile-base-url & /api/settings/profile-url
 * Update Public Profile Base URL (Admin/Super Admin only)
 */
const updateProfileBaseUrlHandler = async (req, res, next) => {
  try {
    const profileBaseUrl = req.body.profileBaseUrl || req.body.baseUrl;
    if (!profileBaseUrl || typeof profileBaseUrl !== 'string' || profileBaseUrl.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Profile Base URL is required',
      });
    }

    const oldUrl = await getActiveProfileBaseUrl(req);
    const updatedUrl = await setActiveProfileBaseUrl(profileBaseUrl, req.user?._id);

    await logAuditAction({
      action: 'PROFILE_BASE_URL_UPDATED',
      oldValue: { profileBaseUrl: oldUrl },
      newValue: { profileBaseUrl: updatedUrl },
      performedBy: req.user?._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile Base URL updated successfully',
      data: {
        profileBaseUrl: updatedUrl,
        baseUrl: updatedUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};
router.put('/profile-base-url', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), updateProfileBaseUrlHandler);
router.put('/profile-url', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), updateProfileBaseUrlHandler);

export default router;
