import { QRRequest } from '../models/QRRequest.js';
import { QRCode } from '../models/QRCode.js';
import { logAuditAction } from '../services/auditService.js';

/**
 * List activation requests submitted for disabled QR codes
 * GET /api/requests
 */
export async function listRequests(req, res, next) {
  try {
    const {
      page = 1,
      limit = 15,
      status = '',
      search = '',
    } = req.query;

    const query = {};

    if (status && ['PENDING', 'RESOLVED', 'SOLVED', 'UNSOLVED', 'REJECTED'].includes(status.toUpperCase())) {
      const s = status.toUpperCase();
      if (s === 'SOLVED' || s === 'RESOLVED') {
        query.status = { $in: ['RESOLVED', 'SOLVED'] };
      } else {
        query.status = s;
      }
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { requesterName: searchRegex },
        { contactNumber: searchRegex },
        { publicCode: searchRegex },
        { message: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [requests, total, pendingCount, resolvedCount, unsolvedCount, rejectedCount] = await Promise.all([
      QRRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('qrCodeId', 'title publicCode destinationUrl status assignedTo')
        .populate('resolvedBy', 'name email'),
      QRRequest.countDocuments(query),
      QRRequest.countDocuments({ status: 'PENDING' }),
      QRRequest.countDocuments({ status: { $in: ['RESOLVED', 'SOLVED'] } }),
      QRRequest.countDocuments({ status: 'UNSOLVED' }),
      QRRequest.countDocuments({ status: 'REJECTED' }),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      counts: {
        pending: pendingCount,
        resolved: resolvedCount,
        unsolved: unsolvedCount,
        rejected: rejectedCount,
        total: pendingCount + resolvedCount + unsolvedCount + rejectedCount,
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get quick count summary for badge indicators
 * GET /api/requests/counts
 */
export async function getRequestCounts(req, res, next) {
  try {
    const [pending, resolved, unsolved, rejected] = await Promise.all([
      QRRequest.countDocuments({ status: 'PENDING' }),
      QRRequest.countDocuments({ status: { $in: ['RESOLVED', 'SOLVED'] } }),
      QRRequest.countDocuments({ status: 'UNSOLVED' }),
      QRRequest.countDocuments({ status: 'REJECTED' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pending,
        resolved,
        unsolved,
        rejected,
        total: pending + resolved + unsolved + rejected,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update activation request status directly (SOLVED, UNSOLVED, PENDING, REJECTED)
 * PATCH /api/requests/:id/status
 */
export async function updateRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, adminNote = '', activateQr = false } = req.body;

    const validStatuses = ['PENDING', 'RESOLVED', 'SOLVED', 'UNSOLVED', 'REJECTED'];
    const targetStatus = String(status || '').toUpperCase();

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status "${status}". Allowed: SOLVED, UNSOLVED, PENDING, REJECTED`,
      });
    }

    const request = await QRRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Activation request not found',
      });
    }

    request.status = targetStatus;
    if (['RESOLVED', 'SOLVED', 'REJECTED'].includes(targetStatus)) {
      request.resolvedBy = req.user ? req.user._id : null;
      request.resolvedAt = new Date();
    } else {
      request.resolvedBy = null;
      request.resolvedAt = null;
    }

    if (adminNote) {
      request.adminNote = adminNote.trim();
    }

    await request.save();

    // If marked solved and activateQr requested, reactivate the QR code
    if ((targetStatus === 'SOLVED' || targetStatus === 'RESOLVED') && activateQr) {
      let targetQr = null;
      if (request.qrCodeId) targetQr = await QRCode.findById(request.qrCodeId);
      if (!targetQr && request.publicCode) targetQr = await QRCode.findOne({ publicCode: request.publicCode });
      if (targetQr && targetQr.status === 'DISABLED') {
        const oldStatus = targetQr.status;
        targetQr.status = 'ACTIVE';
        await targetQr.save();
        await logAuditAction({
          qrCodeId: targetQr._id,
          action: 'STATUS_CHANGED',
          oldValue: { status: oldStatus },
          newValue: { status: 'ACTIVE', note: 'Reactivated via status update to Solved' },
          performedBy: req.user ? req.user._id : null,
        });
      }
    }

    const populated = await QRRequest.findById(request._id)
      .populate('qrCodeId', 'title publicCode destinationUrl status assignedTo')
      .populate('resolvedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: `Request status updated to ${targetStatus}`,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resolve an activation request and optionally reactivate the disabled QR code
 * PATCH /api/requests/:id/resolve
 */
export async function resolveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { activateQr = true, adminNote = '' } = req.body;

    const request = await QRRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Activation request not found',
      });
    }

    request.status = 'RESOLVED';
    request.resolvedBy = req.user ? req.user._id : null;
    request.resolvedAt = new Date();
    if (adminNote) request.adminNote = adminNote.trim();
    await request.save();

    let qrReactivated = false;
    let targetQr = null;

    if (activateQr) {
      // Find associated QR code
      if (request.qrCodeId) {
        targetQr = await QRCode.findById(request.qrCodeId);
      }
      if (!targetQr && request.publicCode) {
        targetQr = await QRCode.findOne({ publicCode: request.publicCode });
      }

      if (targetQr) {
        const oldStatus = targetQr.status;
        if (targetQr.status === 'DISABLED') {
          targetQr.status = 'ACTIVE';
          await targetQr.save();
          qrReactivated = true;

          await logAuditAction({
            qrCodeId: targetQr._id,
            action: 'STATUS_CHANGED',
            oldValue: { status: oldStatus },
            newValue: { status: 'ACTIVE', note: 'Reactivated via customer activation request' },
            performedBy: req.user ? req.user._id : null,
          });
        }
      }
    }

    const populated = await QRRequest.findById(request._id)
      .populate('qrCodeId', 'title publicCode destinationUrl status assignedTo')
      .populate('resolvedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: qrReactivated
        ? `Request resolved and QR code (${targetQr?.publicCode || ''}) has been reactivated!`
        : 'Request marked as resolved',
      data: populated,
      qrReactivated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reject an activation request
 * PATCH /api/requests/:id/reject
 */
export async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { adminNote = '' } = req.body;

    const request = await QRRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Activation request not found',
      });
    }

    request.status = 'REJECTED';
    request.resolvedBy = req.user ? req.user._id : null;
    request.resolvedAt = new Date();
    if (adminNote) request.adminNote = adminNote.trim();
    await request.save();

    const populated = await QRRequest.findById(request._id)
      .populate('qrCodeId', 'title publicCode destinationUrl status assignedTo')
      .populate('resolvedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Request marked as rejected',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete an activation request
 * DELETE /api/requests/:id
 */
export async function deleteRequest(req, res, next) {
  try {
    const { id } = req.params;
    const request = await QRRequest.findByIdAndDelete(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Activation request not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Activation request record deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
