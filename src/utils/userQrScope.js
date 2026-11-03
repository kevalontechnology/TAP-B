import { DigitalProfile } from '../models/DigitalProfile.js';
import { QRCode } from '../models/QRCode.js';

function escapeRegex(str) {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Returns a MongoDB query filter restricting QR codes to only those belonging to the given user.
 * Returns null if the user is SUPER_ADMIN or ADMIN (unrestricted).
 */
export async function getUserQrFilter(user) {
  if (!user) return { _id: null }; // No access if unauthenticated
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    return null; // Full access for admins
  }

  // Find all digital profiles belonging to this user
  const userProfiles = await DigitalProfile.find({ userId: user._id }).select('username linkedQrCode fullName mobileNumber');
  const linkedCodes = userProfiles.map((p) => p.linkedQrCode).filter(Boolean);
  const profileUsernames = userProfiles.map((p) => p.username).filter(Boolean);
  const profilePhones = userProfiles.map((p) => p.mobileNumber).filter(Boolean);

  const orConditions = [
    { createdBy: user._id },
    { 'assignedTo.customerRefId': String(user._id) },
  ];

  if (user.phone && user.phone.trim()) {
    orConditions.push({ 'assignedTo.mobileNumber': user.phone.trim() });
  }

  for (const ph of profilePhones) {
    if (ph && ph.trim()) {
      orConditions.push({ 'assignedTo.mobileNumber': ph.trim() });
    }
  }

  if (user.name && user.name.trim()) {
    orConditions.push({
      'assignedTo.customerName': new RegExp(`^${escapeRegex(user.name.trim())}$`, 'i'),
    });
  }

  if (linkedCodes.length > 0) {
    orConditions.push({ publicCode: { $in: linkedCodes } });
  }

  if (profileUsernames.length > 0) {
    const escapedUsernames = profileUsernames.map(escapeRegex).join('|');
    const regex = new RegExp(`(/|@)(${escapedUsernames})($|\\?|/)`, 'i');
    orConditions.push({ destinationUrl: regex });
  }

  return { $or: orConditions };
}

/**
 * Retrieves an array of QR code ObjectIds that belong to the user.
 * Returns null if the user is SUPER_ADMIN or ADMIN.
 */
export async function getUserQrIds(user) {
  const filter = await getUserQrFilter(user);
  if (!filter) return null; // Admin
  const qrs = await QRCode.find(filter).select('_id');
  return qrs.map((q) => q._id);
}
