import QRCodeLib from 'qrcode';
import { DigitalProfile } from '../models/DigitalProfile.js';
import { ProfileAnalyticsEvent } from '../models/ProfileAnalyticsEvent.js';
import { VisitorLead } from '../models/VisitorLead.js';
import { QRCode } from '../models/QRCode.js';
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

    // Verify mobile number uniqueness (same mobile number cannot be registered twice)
    if (validated.mobileNumber && validated.mobileNumber.trim()) {
      const cleanMobile = validated.mobileNumber.trim();
      const existingMobile = await DigitalProfile.findOne({ mobileNumber: cleanMobile });
      if (existingMobile) {
        return res.status(400).json({
          success: false,
          error: `Mobile number "${cleanMobile}" is already registered with profile "${existingMobile.fullName}" (@${existingMobile.username}). Mobile number must be unique.`,
        });
      }
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

    // By default, customer profiles are Inactive (false) unless card is linked or explicitly activated
    const initialActive =
      validated.isActive !== undefined
        ? validated.isActive
        : req.user.role === 'CUSTOMER'
        ? false
        : true;

    const newProfile = await DigitalProfile.create({
      ...validated,
      username: validated.username.toLowerCase(),
      userId: targetUserId,
      isDefault,
      isActive: initialActive,
      cardLinked: Boolean(validated.cardLinked),
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

    // Verify mobile number uniqueness
    if (validated.mobileNumber !== undefined && validated.mobileNumber.trim()) {
      const cleanMobile = validated.mobileNumber.trim();
      if (cleanMobile !== profile.mobileNumber) {
        const existingMobile = await DigitalProfile.findOne({
          mobileNumber: cleanMobile,
          _id: { $ne: profile._id },
        });
        if (existingMobile) {
          return res.status(400).json({
            success: false,
            error: `Mobile number "${cleanMobile}" is already registered with another profile (${existingMobile.fullName}). Mobile number must be unique.`,
          });
        }
      }
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
  if (publicUrl) parts.push(`URL;TYPE=KevalonTapProfile:${publicUrl}`);
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

/**
 * GET /api/profiles/my-cards
 * Retrieve all cards for authenticated user
 */
export async function getMyCards(req, res, next) {
  try {
    const userId = req.user._id;
    const profiles = await DigitalProfile.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
    const formatted = await Promise.all(profiles.map((p) => formatProfile(p, req)));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profiles/:id/add-card
 * Add/link card to profile. Activates the profile immediately.
 */
export async function addCardToProfile(req, res, next) {
  try {
    const { id } = req.params;
    const { cardNickname, cardNumber, nfcUid, linkedQrCode } = req.body;

    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const genCardNumber =
      cardNumber ||
      `TPZ-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    profile.cardLinked = true;
    profile.isActive = true; // Activating profile when card is added!
    profile.cardLinkedAt = new Date();
    profile.cardNumber = genCardNumber;
    if (cardNickname) profile.cardNickname = cardNickname.trim();
    if (nfcUid) profile.nfcUid = nfcUid.trim();
    if (linkedQrCode) profile.linkedQrCode = linkedQrCode.trim();

    await profile.save();
    const formatted = await formatProfile(profile, req);

    return res.status(200).json({
      success: true,
      message: 'Card added successfully! Your profile is now Active.',
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/profiles/:id/toggle-card
 * Disable or Enable the card
 */
export async function toggleCardStatus(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    profile.isActive = !profile.isActive;
    await profile.save();
    const formatted = await formatProfile(profile, req);

    return res.status(200).json({
      success: true,
      message: `Card is now ${profile.isActive ? 'Active' : 'Disabled'}`,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profiles/:id/link-qr
 * Link a Smart Dynamic QR Code to this card
 */
export async function linkQrToCard(req, res, next) {
  try {
    const { id } = req.params;
    const { publicCode } = req.body;

    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const baseUrl = await getActiveProfileBaseUrl(req);
    const profileUrl = `${baseUrl}/${profile.username}`;

    if (publicCode && publicCode.trim()) {
      const cleanCode = publicCode.trim();
      const qr = await QRCode.findOne({ publicCode: cleanCode });
      if (qr) {
        qr.destinationType = 'KEVALON_PROFILE';
        qr.destinationUrl = profileUrl;
        qr.status = 'ACTIVE';
        qr.assignedTo = {
          customerName: profile.fullName,
          mobileNumber: profile.mobileNumber,
          customerRefId: String(profile.userId),
          note: `Linked to KevalonTap Profile: @${profile.username}`,
        };
        qr.assignedAt = new Date();
        await qr.save();
      }
      profile.linkedQrCode = cleanCode;
    } else {
      profile.linkedQrCode = profile.username;
    }

    await profile.save();
    const formatted = await formatProfile(profile, req);

    return res.status(200).json({
      success: true,
      message: 'Smart QR Code linked to card successfully',
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/:id/nfc
 * Retrieve NFC Configuration and write instructions for the card
 */
export async function getNfcPayload(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const baseUrl = await getActiveProfileBaseUrl(req);
    const publicUrl = `${baseUrl}/${profile.username}`;
    const vcfUrl = `${baseUrl}/api/public/profile/${profile.username}/vcf`;

    return res.status(200).json({
      success: true,
      data: {
        profileId: profile._id,
        username: profile.username,
        fullName: profile.fullName,
        cardNumber: profile.cardNumber || `TPZ-${profile.username.toUpperCase()}`,
        cardNickname: profile.cardNickname || `${profile.fullName}'s Card`,
        nfcPayloadUrl: publicUrl,
        vcfDownloadUrl: vcfUrl,
        ndefUriRecord: publicUrl,
        isActive: profile.isActive,
        writeInstructions: [
          'Install the free "NFC Tools" app from Google Play Store or Apple App Store.',
          'Open NFC Tools and tap on the "Write" tab.',
          'Tap "Add a record" and choose "Custom URL / URI".',
          'Paste your KevalonTap Card URL into the URI field.',
          'Tap "Write" and touch your physical NFC PVC Card to the back of your smartphone.',
          'Success! Your KevalonTap Digital Business Card is now permanently active and ready for instant contactless sharing.',
        ],
      },
    });
  } catch (err) {
    next(err);
  }
}
