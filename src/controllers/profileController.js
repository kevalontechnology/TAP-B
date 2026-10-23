import QRCodeLib from 'qrcode';
import { DigitalProfile } from '../models/DigitalProfile.js';
import { ProfileAnalyticsEvent } from '../models/ProfileAnalyticsEvent.js';
import { VisitorLead } from '../models/VisitorLead.js';
import { getActiveProfileBaseUrl } from '../utils/baseUrlHelper.js';
import { createProfileSchema, updateProfileSchema } from '../validators/profileValidator.js';

/**
 * Format profile with public URL and computed metrics
 */
async function formatProfile(profile, req) {
  const baseUrl = await getActiveProfileBaseUrl(req);
  const plain = profile.toObject ? profile.toObject() : { ...profile };
  plain.publicUrl = `${baseUrl}/${plain.username}`;

  // Calculate views baseline
  const baselineQuery = {
    profileId: plain._id,
    eventType: 'profile_view',
  };
  if (plain.statsResetBaseline) {
    baselineQuery.timestamp = { $gte: plain.statsResetBaseline };
  }

  const totalViews = await ProfileAnalyticsEvent.countDocuments(baselineQuery);
  plain.totalViews = totalViews;

  const totalLeads = await VisitorLead.countDocuments({ profileId: plain._id });
  plain.totalLeads = totalLeads;

  return plain;
}

/**
 * GET /api/profiles
 * List all profiles for authenticated user
 */
export async function listProfiles(req, res, next) {
  try {
    const userId = req.user._id;
    const profiles = await DigitalProfile.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    const formatted = await Promise.all(
      profiles.map((p) => formatProfile(p, req))
    );

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/:id
 * Get single profile by ID (ownership enforced)
 */
export async function getProfileById(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    // Authorization check
    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this profile',
      });
    }

    const formatted = await formatProfile(profile, req);
    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profiles
 * Create new profile
 */
export async function createProfile(req, res, next) {
  try {
    const validated = createProfileSchema.parse(req.body);

    // Verify username uniqueness
    const existing = await DigitalProfile.findOne({ username: validated.username.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Username already taken. Please choose another username.',
      });
    }

    // Determine owner: If admin and userId provided, use target user; otherwise force req.user._id
    let targetUserId = req.user._id;
    if (validated.userId && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
      targetUserId = validated.userId;
    }

    // Check if first profile for this user
    const userProfileCount = await DigitalProfile.countDocuments({ userId: targetUserId });
    const isDefault = userProfileCount === 0 || validated.isDefault;

    if (isDefault && userProfileCount > 0) {
      await DigitalProfile.updateMany({ userId: targetUserId }, { isDefault: false });
    }

    const newProfile = await DigitalProfile.create({
      ...validated,
      username: validated.username.toLowerCase(),
      userId: targetUserId,
      isDefault,
    });

    const formatted = await formatProfile(newProfile, req);
    return res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profiles/:id
 * Update existing profile (ownership enforced)
 */
export async function updateProfile(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this profile',
      });
    }

    const validated = updateProfileSchema.parse(req.body);

    if (validated.username && validated.username.toLowerCase() !== profile.username) {
      const existing = await DigitalProfile.findOne({
        username: validated.username.toLowerCase(),
        _id: { $ne: profile._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken. Please choose another username.',
        });
      }
      profile.username = validated.username.toLowerCase();
    }

    // If setting as default, unset others
    if (validated.isDefault) {
      await DigitalProfile.updateMany(
        { userId: profile.userId, _id: { $ne: profile._id } },
        { isDefault: false }
      );
    }

    // Assign validated fields
    Object.keys(validated).forEach((key) => {
      if (key !== 'username' && validated[key] !== undefined) {
        profile[key] = validated[key];
      }
    });

    await profile.save();
    const formatted = await formatProfile(profile, req);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/profiles/:id/status
 * Toggle or set profile active state
 */
export async function toggleStatus(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to modify this profile',
      });
    }

    if (req.body.isActive !== undefined) {
      profile.isActive = Boolean(req.body.isActive);
    } else {
      profile.isActive = !profile.isActive;
    }

    await profile.save();
    const formatted = await formatProfile(profile, req);

    return res.status(200).json({
      success: true,
      message: `Profile ${profile.isActive ? 'activated' : 'deactivated'} successfully`,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profiles/:id/reset-stats
 * Reset profile statistics baseline without deleting leads or profile data
 */
export async function resetStatistics(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to reset statistics for this profile',
      });
    }

    const resetDate = new Date();
    profile.statsResetBaseline = resetDate;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Statistics baseline reset successfully. New reporting period started.',
      statsResetBaseline: resetDate,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/profiles/:id
 * Delete profile permanently (ownership enforced)
 */
export async function deleteProfile(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this profile',
      });
    }

    // Delete associated analytics and leads, or archive
    await ProfileAnalyticsEvent.deleteMany({ profileId: profile._id });
    await VisitorLead.deleteMany({ profileId: profile._id });
    await DigitalProfile.findByIdAndDelete(profile._id);

    // If deleted profile was default, make another one default if exists
    const remaining = await DigitalProfile.findOne({ userId: req.user._id });
    if (remaining && !remaining.isDefault) {
      remaining.isDefault = true;
      await remaining.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile and associated analytics deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/:id/qr
 * Generate QR code for the profile public URL
 */
export async function getProfileQr(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    const baseUrl = await getActiveProfileBaseUrl(req);
    const publicUrl = `${baseUrl}/${profile.username}`;

    const qrDataUrl = await QRCodeLib.toDataURL(publicUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: profile.themeColor || '#034665',
        light: '#FFFFFF',
      },
    });

    const qrSvg = await QRCodeLib.toString(publicUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: profile.themeColor || '#034665',
        light: '#FFFFFF',
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        publicUrl,
        qrDataUrl,
        qrSvg,
        profile: {
          id: profile._id,
          username: profile.username,
          fullName: profile.fullName,
          themeColor: profile.themeColor,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Build valid vCard 3.0 string
 */
export function buildVCardString(profile, publicUrl) {
  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.fullName}`,
    `N:;${profile.fullName};;;`,
  ];

  if (profile.companyName) parts.push(`ORG:${profile.companyName}`);
  if (profile.designation) parts.push(`TITLE:${profile.designation}`);
  if (profile.mobileNumber) parts.push(`TEL;TYPE=CELL,VOICE:${profile.mobileNumber}`);
  if (profile.whatsappNumber && profile.whatsappNumber !== profile.mobileNumber) {
    parts.push(`TEL;TYPE=WORK,VOICE:${profile.whatsappNumber}`);
  }
  if (profile.alternatePhone) parts.push(`TEL;TYPE=OTHER:${profile.alternatePhone}`);
  if (profile.email1) parts.push(`EMAIL;TYPE=PREF,INTERNET:${profile.email1}`);
  if (profile.email2) parts.push(`EMAIL;TYPE=WORK,INTERNET:${profile.email2}`);
  if (profile.companyWebsite) parts.push(`URL;TYPE=WORK:${profile.companyWebsite}`);
  if (publicUrl) parts.push(`URL;TYPE=TapzyProfile:${publicUrl}`);
  if (profile.companyAddress) parts.push(`ADR;TYPE=WORK:;;${profile.companyAddress};;;;`);
  if (profile.bio) parts.push(`NOTE:${profile.bio.replace(/\n/g, '\\n')}`);

  parts.push('END:VCARD');
  return parts.join('\r\n');
}

/**
 * GET /api/profiles/:id/vcf
 * Download or retrieve vCard for profile
 */
export async function getProfileVcf(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    const baseUrl = await getActiveProfileBaseUrl(req);
    const publicUrl = `${baseUrl}/${profile.username}`;
    const vcard = buildVCardString(profile, publicUrl);

    if (req.query.format === 'json') {
      return res.status(200).json({
        success: true,
        data: {
          vcard,
          filename: `${profile.username}.vcf`,
        },
      });
    }

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${profile.username}.vcf"`);
    return res.status(200).send(vcard);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/company-lookup/:code
 * Auto-fetch company details using companyCode, username, or companyName
 * Used when creating Sales / Employee profiles
 */
export async function lookupCompanyByCode(req, res, next) {
  try {
    const { code } = req.params;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: 'Company code is required' });
    }

    const cleanCode = code.trim();
    const cleanUpper = cleanCode.toUpperCase();
    const cleanLower = cleanCode.toLowerCase();

    const companyProfile = await DigitalProfile.findOne({
      $or: [
        { companyCode: cleanUpper },
        { username: cleanLower },
        { companyName: new RegExp(`^${cleanCode}$`, 'i') },
      ],
      isActive: true,
    });

    if (!companyProfile || (!companyProfile.companyName && !companyProfile.companyCode)) {
      return res.status(404).json({
        success: false,
        error: `Company code "${cleanCode}" not found. Please verify with your company admin.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Company details retrieved successfully',
      data: {
        companyCode: companyProfile.companyCode || cleanUpper,
        companyName: companyProfile.companyName || companyProfile.fullName,
        companyLogo: companyProfile.companyLogo || '',
        industry: companyProfile.industry || '',
        companyDescription: companyProfile.companyDescription || '',
        companyWebsite: companyProfile.companyWebsite || '',
        companyAddress: companyProfile.companyAddress || '',
        googleMapsLocation: companyProfile.googleMapsLocation || '',
        brochureUrl: companyProfile.brochureUrl || '',
        themeColor: companyProfile.themeColor || '#034665',
        services: companyProfile.services || [],
        products: companyProfile.products || [],
      },
    });
  } catch (err) {
    next(err);
  }
}
