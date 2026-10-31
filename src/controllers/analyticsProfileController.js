import { DigitalProfile } from '../models/DigitalProfile.js';
import { ProfileAnalyticsEvent } from '../models/ProfileAnalyticsEvent.js';
import { VisitorLead } from '../models/VisitorLead.js';

/**
 * Helper to build date range query with baseline
 */
function getDateQuery(range, baseline) {
  const now = new Date();
  let start = new Date(0);

  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === '7d') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '30d') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // If baseline is later than calculated start, use baseline
  if (baseline && new Date(baseline) > start) {
    start = new Date(baseline);
  }

  return { $gte: start, $lte: now };
}

/**
 * GET /api/profiles/:id/statistics
 * Comprehensive overview statistics for profile
 */
export async function getProfileStatistics(req, res, next) {
  try {
    const { id } = req.params;
    const { range = '30d' } = req.query;

    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const baseline = profile.statsResetBaseline;
    const baseMatch = { profileId: profile._id };
    if (baseline) {
      baseMatch.timestamp = { $gte: baseline };
    }

    const dateQuery = getDateQuery(range, baseline);
    const rangeMatch = { ...baseMatch, timestamp: dateQuery };

    // 1. Metric totals
    const totalViews = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'profile_view',
    });

    const viewsToday = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'profile_view',
      timestamp: getDateQuery('today', baseline),
    });

    const views7d = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'profile_view',
      timestamp: getDateQuery('7d', baseline),
    });

    const views30d = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'profile_view',
      timestamp: getDateQuery('30d', baseline),
    });

    const totalClicks = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'link_click',
    });

    const clicksToday = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'link_click',
      timestamp: getDateQuery('today', baseline),
    });

    const clicks7d = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'link_click',
      timestamp: getDateQuery('7d', baseline),
    });

    const clicks30d = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'link_click',
      timestamp: getDateQuery('30d', baseline),
    });

    const vcfDownloads = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      eventType: 'vcf_download',
    });

    const totalLeads = await VisitorLead.countDocuments({
      profileId: profile._id,
      ...(baseline ? { createdAt: { $gte: baseline } } : {}),
    });

    // 2. Unique visitors estimate
    const uniqueVisitorsResult = await ProfileAnalyticsEvent.aggregate([
      { $match: { ...baseMatch, eventType: 'profile_view', visitorId: { $ne: '' } } },
      { $group: { _id: '$visitorId', count: { $sum: 1 } } },
    ]);
    const uniqueVisitors = uniqueVisitorsResult.length;
    const returningVisitors = uniqueVisitorsResult.filter((v) => v.count > 1).length;

    // 3. QR / NFC attributable traffic
    const qrTraffic = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      referralSource: 'qr_scan',
    });
    const nfcTraffic = await ProfileAnalyticsEvent.countDocuments({
      ...baseMatch,
      referralSource: 'nfc_tap',
    });

    // 4. Time series data for charts (by day)
    const timeSeriesData = await ProfileAnalyticsEvent.aggregate([
      { $match: rangeMatch },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            type: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    // Format time series map
    const daysMap = {};
    const daysCount = range === 'today' ? 1 : range === '7d' ? 7 : 30;
    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().split('T')[0];
      daysMap[dayStr] = { date: dayStr, views: 0, clicks: 0 };
    }

    timeSeriesData.forEach((item) => {
      const day = item._id.day;
      if (!daysMap[day]) {
        daysMap[day] = { date: day, views: 0, clicks: 0 };
      }
      if (item._id.type === 'profile_view') {
        daysMap[day].views += item.count;
      } else if (item._id.type === 'link_click') {
        daysMap[day].clicks += item.count;
      }
    });

    const chartTimeline = Object.values(daysMap);

    // 5. Platform comparison
    const platformBreakdown = await ProfileAnalyticsEvent.aggregate([
      { $match: { ...rangeMatch, eventType: 'link_click', platform: { $ne: '' } } },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const topPlatform = platformBreakdown.length > 0 ? platformBreakdown[0]._id : 'None';

    // 6. Device breakdown
    const deviceBreakdown = await ProfileAnalyticsEvent.aggregate([
      { $match: rangeMatch },
      { $group: { _id: '$deviceCategory', count: { $sum: 1 } } },
    ]);

    // 7. Visitor classification breakdown
    const knownContacts = await VisitorLead.countDocuments({
      profileId: profile._id,
      ...(baseline ? { createdAt: { $gte: baseline } } : {}),
    });
    const anonymousVisitors = Math.max(0, uniqueVisitors - knownContacts);

    return res.status(200).json({
      success: true,
      data: {
        profileId: profile._id,
        range,
        statsResetBaseline: baseline,
        overview: {
          totalViews,
          viewsToday,
          views7d,
          views30d,
          totalClicks,
          clicksToday,
          clicks7d,
          clicks30d,
          uniqueVisitors,
          returningVisitors,
          contactSaves: vcfDownloads,
          totalLeads,
          topPlatform,
          qrTraffic,
          nfcTraffic,
        },
        chartTimeline,
        platformBreakdown: platformBreakdown.map((p) => ({
          platform: p._id,
          clicks: p.count,
        })),
        deviceBreakdown: deviceBreakdown.map((d) => ({
          category: d._id || 'Unknown',
          count: d.count,
        })),
        visitorClassification: {
          knownContacts,
          anonymousVisitors,
          returningVisitors,
          newLeads: knownContacts,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/:id/links/:platform/statistics
 * Detailed analytics for a specific social or custom link
 */
export async function getLinkStatistics(req, res, next) {
  try {
    const { id, platform } = req.params;
    const { linkId, range = '30d' } = req.query;

    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const baseline = profile.statsResetBaseline;
    const match = {
      profileId: profile._id,
      eventType: 'link_click',
      platform: platform.toLowerCase(),
    };

    if (linkId) {
      match.linkId = linkId;
    }
    if (baseline) {
      match.timestamp = { $gte: baseline };
    }

    // Determine configured URL
    let configuredUrl = '';
    const platKey = platform.toLowerCase();
    if (profile[platKey]) {
      configuredUrl = profile[platKey];
    } else if (platKey === 'custom' && linkId && profile.customLinks) {
      const found = profile.customLinks.find((l) => l.id === linkId);
      if (found) configuredUrl = found.url;
    }

    const totalClicks = await ProfileAnalyticsEvent.countDocuments(match);
    const clicksToday = await ProfileAnalyticsEvent.countDocuments({
      ...match,
      timestamp: getDateQuery('today', baseline),
    });
    const clicks7d = await ProfileAnalyticsEvent.countDocuments({
      ...match,
      timestamp: getDateQuery('7d', baseline),
    });
    const clicks30d = await ProfileAnalyticsEvent.countDocuments({
      ...match,
      timestamp: getDateQuery('30d', baseline),
    });

    const uniqueVisitorAggr = await ProfileAnalyticsEvent.aggregate([
      { $match: { ...match, visitorId: { $ne: '' } } },
      { $group: { _id: '$visitorId' } },
    ]);
    const uniqueVisitors = uniqueVisitorAggr.length;

    // Daily timeline for range
    const rangeMatch = { ...match, timestamp: getDateQuery(range, baseline) };
    const timelineAggr = await ProfileAnalyticsEvent.aggregate([
      { $match: rangeMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Device breakdown
    const deviceAggr = await ProfileAnalyticsEvent.aggregate([
      { $match: rangeMatch },
      { $group: { _id: '$deviceCategory', count: { $sum: 1 } } },
    ]);

    // Location breakdown
    const locationAggr = await ProfileAnalyticsEvent.aggregate([
      { $match: rangeMatch },
      {
        $group: {
          _id: {
            country: '$approximateLocation.country',
            city: '$approximateLocation.city',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Identified vs anonymous
    const identifiedClicks = await ProfileAnalyticsEvent.countDocuments({
      ...rangeMatch,
      leadId: { $ne: null },
    });
    const anonymousClicks = Math.max(0, totalClicks - identifiedClicks);

    return res.status(200).json({
      success: true,
      data: {
        platform,
        linkId: linkId || null,
        configuredUrl,
        metrics: {
          totalClicks,
          clicksToday,
          clicks7d,
          clicks30d,
          uniqueVisitors,
          identifiedClicks,
          anonymousClicks,
        },
        timeline: timelineAggr.map((t) => ({ date: t._id, clicks: t.clicks })),
        devices: deviceAggr.map((d) => ({ category: d._id || 'Unknown', count: d.count })),
        locations: locationAggr.map((l) => ({
          location: `${l._id.city || 'Unknown'}, ${l._id.country || 'Unknown'}`,
          count: l.count,
        })),
        measurementNote:
          'KevalonTap records verified redirection clicks. External platform engagement is not directly trackable once visitor leaves KevalonTap.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/:id/activity
 * Paginated recent activity timeline of interactions
 */
export async function getProfileActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, eventType } = req.query;

    const profile = await DigitalProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (
      profile.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const baseline = profile.statsResetBaseline;
    const query = { profileId: profile._id };
    if (baseline) {
      query.timestamp = { $gte: baseline };
    }
    if (eventType) {
      query.eventType = eventType;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      ProfileAnalyticsEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('leadId', 'fullName email companyName'),
      ProfileAnalyticsEvent.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        events: events.map((e) => ({
          id: e._id,
          eventType: e.eventType,
          platform: e.platform,
          destinationUrl: e.destinationUrl,
          referralSource: e.referralSource,
          deviceCategory: e.deviceCategory,
          location: `${e.approximateLocation?.city || 'Unknown'}, ${e.approximateLocation?.country || 'Unknown'}`,
          timestamp: e.timestamp,
          identifiedContact: e.leadId ? e.leadId.fullName : null,
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
