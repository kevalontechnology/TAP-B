import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { QRCode } from '../models/QRCode.js';

/**
 * Finds the User account associated with an activation QRRequest
 */
export async function findUserForRequest(request) {
  if (!request) return null;

  // 1. Direct userId linked to request
  if (request.userId) {
    const user = await User.findById(request.userId);
    if (user) return user;
  }

  // 2. Through QRCode owner / assignment
  let qr = null;
  if (request.qrCodeId) {
    qr = await QRCode.findById(request.qrCodeId);
  }
  if (!qr && request.publicCode) {
    qr = await QRCode.findOne({ publicCode: request.publicCode });
  }

  if (qr) {
    if (qr.assignedTo?.customerRefId) {
      const user = await User.findById(qr.assignedTo.customerRefId);
      if (user) return user;
    }
    if (qr.createdBy) {
      const user = await User.findById(qr.createdBy);
      if (user) return user;
    }
    const userByQr = await User.findOne({ qrCodeId: qr._id });
    if (userByQr) return userByQr;
  }

  // 3. Through contact phone number matching
  if (request.contactNumber) {
    const rawPhone = String(request.contactNumber).trim();
    const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
    const last10 = cleanDigits.slice(-10);

    if (last10) {
      const user = await User.findOne({
        $or: [
          { phone: rawPhone },
          { phone: cleanDigits },
          { phone: { $regex: `${last10}$` } },
        ],
      });
      if (user) return user;
    }
  }

  return null;
}

/**
 * Create a notification when an activation request is SOLVED, UNSOLVED, or REJECTED
 */
export async function createActivationStatusNotification({
  request,
  status,
  reason = '',
  adminUser = null,
}) {
  try {
    if (!request) return null;

    const user = await findUserForRequest(request);
    if (!user) {
      console.warn(
        `[NotificationService] No user found for request ID: ${request._id} (code: ${request.publicCode}, phone: ${request.contactNumber})`
      );
      return null;
    }

    const normalizedStatus = String(status || '').toUpperCase();
    const cleanReason = (reason || request.adminNote || '').trim();
    const publicCode = request.publicCode || 'NFC Smart Card';

    let notifType = 'SYSTEM';
    let title = '';
    let message = '';

    if (normalizedStatus === 'SOLVED' || normalizedStatus === 'RESOLVED') {
      notifType = 'ACTIVATION_SOLVED';
      title = `Activation Request Solved (${publicCode}) ✅`;
      message = cleanReason
        ? `Your activation request for QR code ${publicCode} has been solved. Note: "${cleanReason}"`
        : `Your activation request for QR code ${publicCode} has been successfully solved! Your card is now active.`;
    } else if (normalizedStatus === 'REJECTED') {
      notifType = 'ACTIVATION_REJECTED';
      title = `Activation Request Rejected (${publicCode}) ❌`;
      message = cleanReason
        ? `Your activation request for QR code ${publicCode} was rejected. Reason: "${cleanReason}"`
        : `Your activation request for QR code ${publicCode} was rejected. Please contact support.`;
    } else if (normalizedStatus === 'UNSOLVED') {
      notifType = 'ACTIVATION_UNSOLVED';
      title = `Activation Request Unsolved (${publicCode}) ⚠️`;
      message = cleanReason
        ? `Your activation request for QR code ${publicCode} is currently marked unsolved. Reason: "${cleanReason}"`
        : `Your activation request for QR code ${publicCode} is under technical investigation and marked as unsolved.`;
    } else {
      return null;
    }

    const notification = await Notification.create({
      userId: user._id,
      title,
      message,
      type: notifType,
      status: 'UNREAD',
      relatedId: request._id,
      relatedType: 'QRRequest',
      publicCode,
      reason: cleanReason,
      metadata: {
        status: normalizedStatus,
        resolvedBy: adminUser?.name || 'Administrator',
        resolvedAt: new Date(),
        requesterName: request.requesterName,
        contactNumber: request.contactNumber,
      },
    });

    // Also update request.userId if not set
    if (!request.userId) {
      request.userId = user._id;
      await request.save().catch(() => {});
    }

    console.log(
      `[NotificationService] Successfully notified user ${user._id} (${user.email || user.name}) for request ${request._id} with status ${normalizedStatus}`
    );
    return notification;
  } catch (err) {
    console.error('[NotificationService] Error creating activation notification:', err);
    return null;
  }
}

/**
 * Get all notifications for an authenticated user
 */
export async function getUserNotifications(userId, { limit = 30, page = 1 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, status: 'UNREAD' }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { status: 'READ', readAt: new Date() } },
    { new: true }
  );
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId) {
  return Notification.updateMany(
    { userId, status: 'UNREAD' },
    { $set: { status: 'READ', readAt: new Date() } }
  );
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId, userId) {
  return Notification.findOneAndDelete({ _id: notificationId, userId });
}
