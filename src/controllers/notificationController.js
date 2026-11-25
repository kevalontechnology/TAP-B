import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/notificationService.js';

/**
 * Get all notifications for the authenticated user
 * GET /api/notifications
 */
export async function listNotifications(req, res, next) {
  try {
    const { limit = 30, page = 1 } = req.query;
    const result = await getUserNotifications(req.user._id, { limit, page });

    return res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await markNotificationAsRead(id, req.user._id);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark all notifications as read for current user
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead(req, res, next) {
  try {
    await markAllNotificationsAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export async function removeNotification(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await deleteNotification(id, req.user._id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (err) {
    next(err);
  }
}
