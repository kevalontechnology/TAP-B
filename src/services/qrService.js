import archiver from 'archiver';
import { QRCode } from '../models/QRCode.js';
import { QRBatch } from '../models/QRBatch.js';
import { config } from '../config/env.js';
import { generatePublicCode, generateBatchId } from '../utils/cryptoCode.js';
import { validateDestinationSafety } from '../utils/urlSafety.js';
import { generateQrPngBuffer } from '../utils/qrGenerator.js';
import { logAuditAction } from './auditService.js';
import { getActiveBaseUrl } from '../utils/baseUrlHelper.js';

/**
 * Generate a unique public code that does not exist in DB
 */
async function getUniquePublicCode() {
  let attempts = 0;
  while (attempts < 10) {
    const code = generatePublicCode(8, 'KT');
    const existing = await QRCode.findOne({ publicCode: code });
    if (!existing) {
      return code;
    }
    attempts++;
  }
  // Fallback to longer code if collision
  return generatePublicCode(12, 'KT');
}

/**
 * Create a single QR code - Only stores publicCode in DB!
 */
export async function createSingleQr(data, user) {
  const publicCode = await getUniquePublicCode();
  const baseUrl = await getActiveBaseUrl();

  const assignedToData = {
    customerName: (data.assignedTo?.customerName || data.customerName || '').trim(),
    mobileNumber: (data.assignedTo?.mobileNumber || data.mobileNumber || '').trim(),
    customerRefId: (data.assignedTo?.customerRefId || data.customerRefId || '').trim(),
    note: (data.assignedTo?.note || data.note || '').trim(),
  };

  let status = 'UNASSIGNED';
  let destinationUrl = '';
  let assignedAt = null;

  if (data.destinationUrl && data.destinationUrl.trim() !== '') {
    const safety = validateDestinationSafety(data.destinationUrl);
    if (!safety.safe) {
      const err = new Error(safety.error || 'Invalid destination URL');
      err.statusCode = 400;
      throw err;
    }
    destinationUrl = safety.sanitizedUrl;
    status = 'ACTIVE';
    if (assignedToData.customerName || assignedToData.mobileNumber) {
      assignedAt = new Date();
    }
  }

  const qrTitle = (
    data.title?.trim() ||
    (assignedToData.customerName ? `${assignedToData.customerName}'s Kevalon One QR` : `Kevalon One QR ${publicCode}`)
  );

  // Store only the code in MongoDB! No hardcoded shortUrl stored.
  const qr = await QRCode.create({
    publicCode,
    title: qrTitle,
    description: data.description || '',
    shortUrl: '',
    destinationType: data.destinationType || 'KEVALON_PROFILE',
    destinationUrl,
    customData: data.customData || null,
    status,
    assignedTo: assignedToData,
    assignedAt,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    style: {
      fgColor: data.style?.fgColor || '#000000',
      bgColor: data.style?.bgColor || '#FFFFFF',
      logoUrl: data.style?.logoUrl || '',
    },
    createdBy: user?._id || null,
    updatedBy: user?._id || null,
  });

  const qrObj = qr.toJSON();
  qrObj.shortUrl = `${baseUrl}/q/${publicCode}`;

  await logAuditAction({
    qrCodeId: qr._id,
    action: 'CREATED',
    newValue: qrObj,
    performedBy: user?._id,
  });

  return qrObj;
}

/**
 * Generate bulk QR codes - Only stores publicCode in DB!
 */
export async function generateBulkQrs(data, user) {
  const batchId = generateBatchId('KEVALON');
  const quantity = data.quantity;

  const batch = await QRBatch.create({
    batchId,
    batchName: data.batchName,
    quantity,
    status: 'PROCESSING',
    createdBy: user?._id || null,
  });

  try {
    const codesToInsert = [];
    const usedCodes = new Set();

    for (let i = 0; i < quantity; i++) {
      let publicCode;
      do {
        publicCode = generatePublicCode(8, 'KT');
      } while (usedCodes.has(publicCode));
      usedCodes.add(publicCode);

      codesToInsert.push({
        publicCode,
        title: `${data.batchName} #${String(i + 1).padStart(4, '0')}`,
        description: `Generated in batch ${data.batchName} (${batchId})`,
        shortUrl: '', // In backend only store publicCode!
        destinationType: 'WEBSITE',
        destinationUrl: '',
        status: 'UNASSIGNED',
        batchId,
        style: {
          fgColor: data.fgColor || '#000000',
          bgColor: data.bgColor || '#FFFFFF',
          logoUrl: '',
        },
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      });
    }

    // Insert in chunks of 500 for optimal performance
    const chunkSize = 500;
    for (let i = 0; i < codesToInsert.length; i += chunkSize) {
      const chunk = codesToInsert.slice(i, i + chunkSize);
      await QRCode.insertMany(chunk, { ordered: false });
    }

    batch.generatedCount = quantity;
    batch.status = 'COMPLETED';
    await batch.save();

    await logAuditAction({
      action: 'BULK_GENERATED',
      newValue: { batchId, batchName: data.batchName, quantity },
      performedBy: user?._id,
    });

    return batch;
  } catch (err) {
    batch.status = 'FAILED';
    await batch.save();
    throw err;
  }
}

/**
 * Assign an unassigned QR code to a customer with destination
 */
export async function assignQr(qrId, data, user) {
  const qr = await QRCode.findById(qrId);
  if (!qr) {
    const err = new Error('QR code not found');
    err.statusCode = 404;
    throw err;
  }

  const safety = validateDestinationSafety(data.destinationUrl);
  if (!safety.safe) {
    const err = new Error(safety.error || 'Invalid destination URL');
    err.statusCode = 400;
    throw err;
  }

  const oldValue = qr.toJSON();

  qr.assignedTo = {
    customerName: (data.customerName || '').trim(),
    mobileNumber: (data.mobileNumber || '').trim(),
    customerRefId: (data.customerRefId || '').trim(),
    note: (data.note || '').trim(),
  };
  qr.assignedAt = new Date();
  qr.destinationType = data.destinationType || 'KEVALON_PROFILE';
  qr.destinationUrl = safety.sanitizedUrl;
  qr.customData = data.customData || null;
  qr.status = 'ACTIVE';
  qr.updatedBy = user?._id || null;

  if (data.customerName && (!qr.title || qr.title.startsWith('Tapzy QR') || qr.title.startsWith('Tapzy Standee') || qr.title.startsWith('Kevalon One QR') || qr.title.startsWith('Kevalon One Standee'))) {
    qr.title = `${data.customerName.trim()}'s Kevalon One QR`;
  }

  await qr.save();

  await logAuditAction({
    qrCodeId: qr._id,
    action: 'ASSIGNED',
    oldValue,
    newValue: qr.toJSON(),
    performedBy: user?._id,
  });

  return qr;
}

/**
 * Update QR code destination URL
 */
export async function updateDestination(qrId, data, user) {
  const qr = await QRCode.findById(qrId);
  if (!qr) {
    const err = new Error('QR code not found');
    err.statusCode = 404;
    throw err;
  }

  const safety = validateDestinationSafety(data.destinationUrl);
  if (!safety.safe) {
    const err = new Error(safety.error || 'Invalid destination URL');
    err.statusCode = 400;
    throw err;
  }

  const oldValue = {
    destinationType: qr.destinationType,
    destinationUrl: qr.destinationUrl,
    customData: qr.customData,
  };

  qr.destinationType = data.destinationType || qr.destinationType;
  qr.destinationUrl = safety.sanitizedUrl;
  if (data.customData !== undefined) {
    qr.customData = data.customData;
  }
  qr.updatedBy = user?._id || null;

  // If was unassigned, make it active
  if (qr.status === 'UNASSIGNED') {
    qr.status = 'ACTIVE';
  }

  await qr.save();

  await logAuditAction({
    qrCodeId: qr._id,
    action: 'DESTINATION_UPDATED',
    oldValue,
    newValue: {
      destinationType: qr.destinationType,
      destinationUrl: qr.destinationUrl,
      customData: qr.customData,
    },
    performedBy: user?._id,
  });

  return qr;
}

/**
 * Update QR code status (e.g. ENABLE/DISABLE/EXPIRE)
 */
export async function updateStatus(qrId, status, user) {
  const qr = await QRCode.findById(qrId);
  if (!qr) {
    throw new Error('QR code not found');
  }

  const oldValue = { status: qr.status };
  qr.status = status;
  qr.updatedBy = user?._id || null;
  await qr.save();

  await logAuditAction({
    qrCodeId: qr._id,
    action: 'STATUS_CHANGED',
    oldValue,
    newValue: { status },
    performedBy: user?._id,
  });

  return qr;
}

/**
 * Stream a ZIP archive of all QR code PNG images in a batch
 */
export async function streamBatchZip(batchId, res) {
  const qrs = await QRCode.find({ batchId }).sort({ createdAt: 1 });
  if (!qrs.length) {
    throw new Error('No QR codes found for this batch');
  }

  const baseUrl = await getActiveBaseUrl();

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="KevalonOne-Batch-${batchId}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  // Add individual QR code PNG files with dynamic Short URL
  for (const qr of qrs) {
    const dynamicShortUrl = `${baseUrl}/q/${qr.publicCode}`;
    const pngBuffer = await generateQrPngBuffer(dynamicShortUrl, {
      fgColor: qr.style?.fgColor || '#000000',
      bgColor: qr.style?.bgColor || '#FFFFFF',
      width: 1024,
    });
    archive.append(pngBuffer, { name: `${qr.publicCode}-${qr.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` });
  }

  // Also include a CSV index inside the ZIP with dynamic base URL
  const csvContent = generateCsvContent(qrs, baseUrl);
  archive.append(csvContent, { name: `Batch-${batchId}-Index.csv` });

  await archive.finalize();
}

/**
 * Generate CSV string from QR code array with dynamic base URL
 */
export function generateCsvContent(qrs, baseUrl = 'https://qr.kevalonone.com') {
  const headers = [
    'Public Code',
    'Title',
    'Short URL',
    'Status',
    'Destination Type',
    'Destination URL',
    'Customer Name',
    'Customer Ref ID',
    'Scan Count',
    'Batch ID',
    'Created At',
  ];

  const rows = qrs.map((qr) => {
    const dynamicShortUrl = `${baseUrl}/q/${qr.publicCode}`;
    return [
      `"${qr.publicCode}"`,
      `"${(qr.title || '').replace(/"/g, '""')}"`,
      `"${dynamicShortUrl}"`,
      `"${qr.status}"`,
      `"${qr.destinationType || ''}"`,
      `"${(qr.destinationUrl || '').replace(/"/g, '""')}"`,
      `"${(qr.assignedTo?.customerName || '').replace(/"/g, '""')}"`,
      `"${(qr.assignedTo?.customerRefId || '').replace(/"/g, '""')}"`,
      qr.scanCount || 0,
      `"${qr.batchId || ''}"`,
      `"${qr.createdAt ? qr.createdAt.toISOString() : ''}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
