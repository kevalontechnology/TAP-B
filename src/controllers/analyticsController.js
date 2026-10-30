import { getDashboardOverview, getQrCodeAnalytics } from '../services/analyticsService.js';
import { QRScanLog } from '../models/QRScanLog.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await getDashboardOverview();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getQrAnalytics(req, res, next) {
  try {
    const data = await getQrCodeAnalytics(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'QR Code not found',
      });
    }
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function exportScanLogsCsv(req, res, next) {
  try {
    const { qrCodeId } = req.query;
    const query = {};
    if (qrCodeId) query.qrCodeId = qrCodeId;

    const logs = await QRScanLog.find(query).sort({ scannedAt: -1 }).limit(5000);

    const headers = [
      'Scanned At',
      'Public Code',
      'Redirect Status',
      'Device Type',
      'Browser',
      'Operating System',
      'Country',
      'City',
    ];

    const rows = logs.map((log) => [
      `"${log.scannedAt.toISOString()}"`,
      `"${log.publicCode}"`,
      `"${log.redirectStatus}"`,
      `"${log.deviceType}"`,
      `"${log.browser.replace(/"/g, '""')}"`,
      `"${log.operatingSystem.replace(/"/g, '""')}"`,
      `"${log.country}"`,
      `"${log.city}"`,
    ]);

    const csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="KevalonOne-Scan-Logs.csv"`);
    return res.send(csvData);
  } catch (err) {
    next(err);
  }
}
