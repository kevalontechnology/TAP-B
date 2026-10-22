import { QRCode } from '../models/QRCode.js';
import { QRBatch } from '../models/QRBatch.js';
import { QRAuditLog } from '../models/QRAuditLog.js';
import {
  createSingleQr,
  generateBulkQrs,
  assignQr,
  updateDestination,
  updateStatus,
  streamBatchZip,
  generateCsvContent,
} from '../services/qrService.js';
import { generateQrPngBuffer, generateQrSvgString } from '../utils/qrGenerator.js';
import {
  createQrSchema,
  bulkQrSchema,
  assignQrSchema,
  updateDestinationSchema,
  updateStatusSchema,
} from '../validators/qrValidator.js';
import { logAuditAction } from '../services/auditService.js';
import { getActiveBaseUrl } from '../utils/baseUrlHelper.js';

export async function create(req, res, next) {
  try {
    const validated = createQrSchema.parse(req.body);
    const qr = await createSingleQr(validated, req.user);
    return res.status(201).json({
      success: true,
      message: 'QR Code created successfully',
      data: qr,
    });
  } catch (err) {
    next(err);
  }
}

export async function createBulk(req, res, next) {
  try {
    const validated = bulkQrSchema.parse(req.body);
    const batch = await generateBulkQrs(validated, req.user);
    return res.status(201).json({
      success: true,
      message: `Successfully initiated batch generation of ${validated.quantity} QR codes`,
      data: batch,
    });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      batchId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (status && ['UNASSIGNED', 'ACTIVE', 'DISABLED', 'EXPIRED'].includes(status)) {
      query.status = status;
    }

    if (batchId) {
      query.batchId = batchId;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { publicCode: searchRegex },
        { destinationUrl: searchRegex },
        { 'assignedTo.customerName': searchRegex },
        { 'assignedTo.customerRefId': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [qrs, total] = await Promise.all([
      QRCode.find(query).sort(sortOptions).skip(skip).limit(limitNum).populate('createdBy', 'name email'),
      QRCode.countDocuments(query),
    ]);

    const baseUrl = await getActiveBaseUrl(req);
    const formattedQrs = qrs.map((qr) => ({
      ...qr.toJSON(),
      shortUrl: `${baseUrl}/q/${qr.publicCode}`,
    }));

    return res.status(200).json({
      success: true,
      data: formattedQrs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const qr = await QRCode.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!qr) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found',
      });
    }

    const baseUrl = await getActiveBaseUrl(req);
    const qrObj = {
      ...qr.toJSON(),
      shortUrl: `${baseUrl}/q/${qr.publicCode}`,
    };

    return res.status(200).json({
      success: true,
      data: qrObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const qr = await QRCode.findById(req.params.id);
    if (!qr) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found',
      });
    }

    const { title, description, style, expiresAt } = req.body;
    const oldValue = qr.toJSON();

    if (title !== undefined) qr.title = title.trim();
    if (description !== undefined) qr.description = description.trim();
    if (style !== undefined) {
      qr.style = {
        fgColor: style.fgColor || qr.style.fgColor,
        bgColor: style.bgColor || qr.style.bgColor,
        logoUrl: style.logoUrl !== undefined ? style.logoUrl : qr.style.logoUrl,
      };
    }
    if (expiresAt !== undefined) {
      qr.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    qr.updatedBy = req.user?._id;

    await qr.save();

    await logAuditAction({
      qrCodeId: qr._id,
      action: 'STATUS_CHANGED',
      oldValue,
      newValue: qr.toJSON(),
      performedBy: req.user?._id,
    });

    const baseUrl = await getActiveBaseUrl(req);
    const qrObj = {
      ...qr.toJSON(),
      shortUrl: `${baseUrl}/q/${qr.publicCode}`,
    };

    return res.status(200).json({
      success: true,
      message: 'QR code updated successfully',
      data: qrObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDestinationHandler(req, res, next) {
  try {
    const validated = updateDestinationSchema.parse(req.body);
    const qr = await updateDestination(req.params.id, validated, req.user);
    const baseUrl = await getActiveBaseUrl(req);
    const qrObj = {
      ...qr.toJSON(),
      shortUrl: `${baseUrl}/q/${qr.publicCode}`,
    };

    return res.status(200).json({
      success: true,
      message: 'Destination updated successfully',
      data: qrObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function assignHandler(req, res, next) {
  try {
    const validated = assignQrSchema.parse(req.body);
    const qr = await assignQr(req.params.id, validated, req.user);
    const baseUrl = await getActiveBaseUrl(req);
    const qrObj = {
      ...qr.toJSON(),
      shortUrl: `${baseUrl}/q/${qr.publicCode}`,
    };

    return res.status(200).json({
      success: true,
      message: 'QR Code assigned successfully',
      data: qrObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatusHandler(req, res, next) {
  try {
    const validated = updateStatusSchema.parse(req.body);
    const qr = await updateStatus(req.params.id, validated.status, req.user);
    const baseUrl = await getActiveBaseUrl(req);
    const qrObj = {
      ...qr.toJSON(),
      shortUrl: `${baseUrl}/q/${qr.publicCode}`,
    };

    return res.status(200).json({
      success: true,
      message: `QR Code status updated to ${validated.status}`,
      data: qrObj,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteQr(req, res, next) {
  try {
    const qr = await QRCode.findById(req.params.id);
    if (!qr) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found',
      });
    }

    await logAuditAction({
      qrCodeId: qr._id,
      action: 'DELETED',
      oldValue: qr.toJSON(),
      performedBy: req.user?._id,
    });

    await QRCode.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'QR code deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadSingle(req, res, next) {
  try {
    const qr = await QRCode.findById(req.params.id);
    if (!qr) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found',
      });
    }

    const baseUrl = await getActiveBaseUrl(req);
    const dynamicShortUrl = `${baseUrl}/q/${qr.publicCode}`;
    const format = (req.query.format || 'png').toLowerCase();
    const filename = `Tapzy-${qr.publicCode}`;

    if (format === 'svg') {
      const svg = await generateQrSvgString(dynamicShortUrl, {
        fgColor: qr.style?.fgColor || '#000000',
        bgColor: qr.style?.bgColor || '#FFFFFF',
      });

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.svg"`);
      return res.send(svg);
    }

    // Default to PNG
    const pngBuffer = await generateQrPngBuffer(dynamicShortUrl, {
      fgColor: qr.style?.fgColor || '#000000',
      bgColor: qr.style?.bgColor || '#FFFFFF',
      width: 1024,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.png"`);
    return res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
}

export async function downloadBatchZip(req, res, next) {
  try {
    const { batchId } = req.params;
    await streamBatchZip(batchId, res);
  } catch (err) {
    next(err);
  }
}

export async function downloadBatchCsv(req, res, next) {
  try {
    const { batchId } = req.params;
    const qrs = await QRCode.find({ batchId }).sort({ createdAt: 1 });

    if (!qrs.length) {
      return res.status(404).json({
        success: false,
        error: 'No QR codes found for this batch',
      });
    }

    const baseUrl = await getActiveBaseUrl(req);
    const csvData = generateCsvContent(qrs, baseUrl);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Tapzy-Batch-${batchId}.csv"`);
    return res.send(csvData);
  } catch (err) {
    next(err);
  }
}

export async function exportAllCsv(req, res, next) {
  try {
    const { status, batchId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (batchId) query.batchId = batchId;

    const qrs = await QRCode.find(query).sort({ createdAt: -1 });
    const baseUrl = await getActiveBaseUrl(req);
    const csvData = generateCsvContent(qrs, baseUrl);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Tapzy-QRCodes-Export.csv"`);
    return res.send(csvData);
  } catch (err) {
    next(err);
  }
}

export async function listBatches(req, res, next) {
  try {
    const batches = await QRBatch.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    return res.status(200).json({
      success: true,
      data: batches,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditHistory(req, res, next) {
  try {
    const history = await QRAuditLog.find({ qrCodeId: req.params.id })
      .sort({ performedAt: -1 })
      .populate('performedBy', 'name email');

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
}
