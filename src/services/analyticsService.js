import useragent from 'useragent';
import { QRScanLog } from '../models/QRScanLog.js';
import { QRCode } from '../models/QRCode.js';

/**
 * Record a scan event asynchronously
 */
export async function recordScan({ qrCodeId, publicCode, req, redirectStatus }) {
  try {
    const uaString = req.headers['user-agent'] || '';
    const agent = useragent.parse(uaString);

    // Determine device type
    let deviceType = 'Desktop';
    const uaLower = uaString.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(uaLower)) {
      deviceType = 'Tablet';
    } else if (/mobile|iphone|android|touch/i.test(uaLower)) {
      deviceType = 'Mobile';
    } else if (/bot|crawler|spider/i.test(uaLower)) {
      deviceType = 'Bot';
    }

    const browser = agent.toAgent() || 'Unknown';
    const operatingSystem = agent.os.toString() || 'Unknown';

    // Privacy-friendly geo lookup: use headers if behind Cloudflare/Nginx/Proxy
    const country = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'India';
    const city = req.headers['cf-ipcity'] || req.headers['x-city'] || 'Local';

    // Asynchronously create scan log
    await QRScanLog.create({
      qrCodeId,
      publicCode,
      scannedAt: new Date(),
      deviceType,
      browser,
      operatingSystem,
      country,
      city,
      redirectStatus,
    });

    // If valid scan, atomically increment scanCount on QRCode
    if (qrCodeId) {
      await QRCode.findByIdAndUpdate(qrCodeId, {
        $inc: { scanCount: 1 },
        $set: { lastScannedAt: new Date() },
      });
    }
  } catch (err) {
    console.error('[AnalyticsService] Failed to record scan:', err.message);
  }
}

/**
 * Get dashboard overview metrics
 */
export async function getDashboardOverview() {
  const [totalQr, activeQr, unassignedQr, disabledQr, expiredQr] = await Promise.all([
    QRCode.countDocuments(),
    QRCode.countDocuments({ status: 'ACTIVE' }),
    QRCode.countDocuments({ status: 'UNASSIGNED' }),
    QRCode.countDocuments({ status: 'DISABLED' }),
    QRCode.countDocuments({ status: 'EXPIRED' }),
  ]);

  const assignedCount = await QRCode.countDocuments({
    status: { $in: ['ACTIVE', 'DISABLED'] },
    'assignedTo.customerName': { $ne: '' },
  });

  const totalScansResult = await QRCode.aggregate([
    { $group: { _id: null, totalScans: { $sum: '$scanCount' } } },
  ]);
  const totalScans = totalScansResult[0]?.totalScans || 0;

  // Today's scans count from QRScanLog
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayScans = await QRScanLog.countDocuments({
    scannedAt: { $gte: startOfToday },
    redirectStatus: 'SUCCESS',
  });

  // Daily scan counts for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyScansRaw = await QRScanLog.aggregate([
    { $match: { scannedAt: { $gte: sevenDaysAgo }, redirectStatus: 'SUCCESS' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$scannedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in zero-scan days for chart
  const dailyScansMap = {};
  dailyScansRaw.forEach((item) => {
    dailyScansMap[item._id] = item.count;
  });

  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    dailyTrend.push({
      date: dateStr,
      label: dayName,
      scans: dailyScansMap[dateStr] || 0,
    });
  }

  // Device breakdown
  const deviceStats = await QRScanLog.aggregate([
    { $group: { _id: '$deviceType', count: { $sum: 1 } } },
  ]);

  // Browser breakdown
  const browserStats = await QRScanLog.aggregate([
    { $group: { _id: '$browser', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Top 5 scanned QR Codes
  const topQrs = await QRCode.find({ scanCount: { $gt: 0 } })
    .sort({ scanCount: -1 })
    .limit(5)
    .select('title publicCode shortUrl destinationUrl scanCount status');

  return {
    metrics: {
      totalQr,
      activeQr,
      unassignedQr,
      disabledQr,
      expiredQr,
      assignedCount,
      totalScans,
      todayScans,
    },
    dailyTrend,
    deviceStats: deviceStats.map((d) => ({ name: d._id || 'Unknown', value: d.count })),
    browserStats: browserStats.map((b) => ({ name: b._id || 'Unknown', value: b.count })),
    topQrs,
  };
}

/**
 * Get detailed analytics for a single QR code
 */
export async function getQrCodeAnalytics(qrCodeId) {
  const qr = await QRCode.findById(qrCodeId);
  if (!qr) return null;

  const logs = await QRScanLog.find({ qrCodeId }).sort({ scannedAt: -1 }).limit(100);

  const deviceStats = await QRScanLog.aggregate([
    { $match: { qrCodeId: qr._id } },
    { $group: { _id: '$deviceType', count: { $sum: 1 } } },
  ]);

  const browserStats = await QRScanLog.aggregate([
    { $match: { qrCodeId: qr._id } },
    { $group: { _id: '$browser', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Daily scans for this QR for last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const dailyScansRaw = await QRScanLog.aggregate([
    {
      $match: {
        qrCodeId: qr._id,
        scannedAt: { $gte: fourteenDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$scannedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dailyMap = {};
  dailyScansRaw.forEach((item) => {
    dailyMap[item._id] = item.count;
  });

  const timeline = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    timeline.push({
      date: dateStr,
      scans: dailyMap[dateStr] || 0,
    });
  }

  return {
    qr,
    totalScans: qr.scanCount,
    lastScannedAt: qr.lastScannedAt,
    deviceStats: deviceStats.map((d) => ({ name: d._id || 'Unknown', value: d.count })),
    browserStats: browserStats.map((b) => ({ name: b._id || 'Unknown', value: b.count })),
    timeline,
    recentScans: logs,
  };
}
