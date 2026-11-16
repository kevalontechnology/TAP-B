import { QRCode } from '../models/QRCode.js';
import { User } from '../models/User.js';
import { DigitalProfile } from '../models/DigitalProfile.js';
import { generatePublicCode } from '../utils/cryptoCode.js';
import { getActiveProfileBaseUrl } from '../utils/baseUrlHelper.js';

/**
 * Generate a unique public code for a user's permanent Smart Card QR
 */
async function getUniqueCode() {
  let attempts = 0;
  while (attempts < 10) {
    const code = generatePublicCode(8, 'KT');
    const existing = await QRCode.findOne({ publicCode: code });
    if (!existing) return code;
    attempts++;
  }
  return generatePublicCode(12, 'KT');
}

/**
 * Ensure a user has exactly ONE permanent Smart Card QR code.
 * If user already has one, return it.
 * If not, create and assign it permanently to the user.
 */
export async function ensureUserQrCode(user, req = null) {
  if (!user) return null;

  const userId = user._id || user.id;

  // 1. If user document already has qrCodeId
  if (user.qrCodeId) {
    const existing = await QRCode.findById(user.qrCodeId);
    if (existing) {
      if (!user.userCode) {
        await User.findByIdAndUpdate(userId, { userCode: existing.publicCode });
        user.userCode = existing.publicCode;
      }
      return existing;
    }
  }

  // 2. If user document already has userCode
  if (user.userCode) {
    const existing = await QRCode.findOne({ publicCode: user.userCode });
    if (existing) {
      if (!user.qrCodeId) {
        await User.findByIdAndUpdate(userId, { qrCodeId: existing._id });
        user.qrCodeId = existing._id;
      }
      return existing;
    }
  }

  // 3. Check if a QRCode already exists for this user in database
  let qr = await QRCode.findOne({
    $or: [
      { createdBy: userId },
      { 'assignedTo.customerRefId': String(userId) },
    ],
  }).sort({ createdAt: 1 });

  if (qr) {
    await User.findByIdAndUpdate(userId, {
      qrCodeId: qr._id,
      userCode: qr.publicCode,
    });
    user.qrCodeId = qr._id;
    user.userCode = qr.publicCode;

    // Link any unlinked profiles of this user to this code
    await DigitalProfile.updateMany(
      { userId, $or: [{ linkedQrCode: '' }, { linkedQrCode: null }, { linkedQrCode: { $exists: false } }] },
      { linkedQrCode: qr.publicCode }
    );

    return qr;
  }

  // 4. Otherwise, generate a brand new permanent QRCode for this user
  const publicCode = await getUniqueCode();
  const profileBaseUrl = await getActiveProfileBaseUrl(req);

  // Check if user already has an active profile to set as initial destinationUrl
  const initialProfile =
    (await DigitalProfile.findOne({ userId, isDefault: true })) ||
    (await DigitalProfile.findOne({ userId, isActive: true })) ||
    (await DigitalProfile.findOne({ userId }));

  const destinationUrl = initialProfile ? `${profileBaseUrl}/${initialProfile.username}` : '';

  qr = await QRCode.create({
    publicCode,
    title: `${user.name || 'User'}'s KevalonTap Card`,
    description: `Universal KevalonTap Smart QR permanently assigned to ${user.name || 'Customer'}`,
    destinationType: 'KEVALON_PROFILE',
    destinationUrl,
    status: 'ACTIVE',
    assignedTo: {
      customerName: user.name || 'Customer',
      mobileNumber: user.phone || '',
      customerRefId: String(userId),
      note: 'Account Universal QR Code',
    },
    assignedAt: new Date(),
    createdBy: userId,
  });

  await User.findByIdAndUpdate(userId, {
    qrCodeId: qr._id,
    userCode: publicCode,
  });
  user.qrCodeId = qr._id;
  user.userCode = publicCode;

  // Link any profiles of this user to this code
  await DigitalProfile.updateMany(
    { userId },
    { linkedQrCode: publicCode }
  );

  return qr;
}

/**
 * Resolve the current target digital profile for a user's QR code.
 * If user has multiple profiles, routes to the default/active one.
 */
export async function getActiveProfileForUser(userId) {
  if (!userId) return null;
  return (
    (await DigitalProfile.findOne({ userId, isDefault: true, isActive: true })) ||
    (await DigitalProfile.findOne({ userId, isDefault: true })) ||
    (await DigitalProfile.findOne({ userId, isActive: true })) ||
    (await DigitalProfile.findOne({ userId }).sort({ createdAt: -1 }))
  );
}

/**
 * Sync user's permanent QRCode destinationUrl to their current active profile
 */
export async function syncUserQrDestination(userId, req = null) {
  try {
    if (!userId) return null;
    const user = await User.findById(userId);
    if (!user) return null;

    const qr = await ensureUserQrCode(user, req);
    if (!qr) return null;

    const activeProfile = await getActiveProfileForUser(userId);
    if (activeProfile) {
      const profileBaseUrl = await getActiveProfileBaseUrl(req);
      const targetUrl = `${profileBaseUrl}/${activeProfile.username}`;
      if (qr.destinationUrl !== targetUrl) {
        qr.destinationUrl = targetUrl;
        await qr.save();
      }
    }
    return qr;
  } catch (err) {
    console.error('[UserQrService] Failed to sync user QR destination:', err.message);
    return null;
  }
}
