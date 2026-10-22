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

    if (status && ['PENDING', 'RESOLVED', 'REJECTED'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
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

    const [requests, total, pendingCount, resolvedCount, rejectedCount] = await Promise.all([
      QRRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('qrCodeId', 'title publicCode destinationUrl status assignedTo')
        .populate('resolvedBy', 'name email'),
      QRRequest.countDocuments(query),
      QRRequest.countDocuments({ status: 'PENDING' }),
      QRRequest.countDocuments({ status: 'RESOLVED' }),
      QRRequest.countDocuments({ status: 'REJECTED' }),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      counts: {
        pending: pendingCount,
        resolved: resolvedCount,
        rejected: rejectedCount,
        total: pendingCount + resolvedCount + rejectedCount,
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
    const [pending, resolved, rejected] = await Promise.all([
      QRRequest.countDocuments({ status: 'PENDING' }),
      QRRequest.countDocuments({ status: 'RESOLVED' }),
      QRRequest.countDocuments({ status: 'REJECTED' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pending,
        resolved,
        rejected,
        total: pending + resolved + rejected,
      },
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
