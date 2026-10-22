import { VisitorLead } from '../models/VisitorLead.js';
import { DigitalProfile } from '../models/DigitalProfile.js';
import { ProfileAnalyticsEvent } from '../models/ProfileAnalyticsEvent.js';

/**
 * GET /api/profiles/:id/leads
 * Get leads for a specific profile
 */
export async function getProfileLeads(req, res, next) {
  try {
    const { id } = req.params;
    const { status, search, page = 1, limit = 20 } = req.query;

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

    const query = { profileId: profile._id };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: regex },
        { email: regex },
        { companyName: regex },
        { phoneNumber: regex },
        { designation: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      VisitorLead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      VisitorLead.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        leads,
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

/**
 * GET /api/leads
 * Get all leads for the authenticated customer across all their profiles
 */
export async function getAllUserLeads(req, res, next) {
  try {
    const userId = req.user._id;
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { ownerId: userId };
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: regex },
        { email: regex },
        { companyName: regex },
        { phoneNumber: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      VisitorLead.find(query)
        .populate('profileId', 'fullName username companyName themeColor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      VisitorLead.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        leads,
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

/**
 * GET /api/leads/:leadId
 * Get detailed lead record with associated click interactions
 */
export async function getLeadDetails(req, res, next) {
  try {
    const { leadId } = req.params;
    const lead = await VisitorLead.findById(leadId).populate('profileId', 'fullName username themeColor');

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (
      lead.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Find interactions associated with this lead
    const interactions = await ProfileAnalyticsEvent.find({
      $or: [{ leadId: lead._id }, { visitorId: lead.visitorId, visitorId: { $ne: '' } }],
    })
      .sort({ timestamp: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      data: {
        lead,
        interactions: interactions.map((i) => ({
          eventType: i.eventType,
          platform: i.platform,
          timestamp: i.timestamp,
          destinationUrl: i.destinationUrl,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/leads/:leadId/status
 * Update lead status
 */
export async function updateLeadStatus(req, res, next) {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    const validStatuses = ['NEW', 'CONTACTED', 'CONVERTED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const lead = await VisitorLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (
      lead.ownerId.toString() !== req.user._id.toString() &&
      req.user.role !== 'SUPER_ADMIN' &&
      req.user.role !== 'ADMIN'
    ) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    lead.status = status;
    await lead.save();

    return res.status(200).json({
      success: true,
      message: `Lead status updated to ${status}`,
      data: lead,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/export
 * Export leads as CSV
 */
export async function exportLeads(req, res, next) {
  try {
    const userId = req.user._id;
    const { profileId } = req.query;

    const query = { ownerId: userId };
    if (profileId) {
      query.profileId = profileId;
    }

    const leads = await VisitorLead.find(query).populate('profileId', 'username fullName');

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Company',
      'Designation',
      'Interested Service',
      'Message',
      'Status',
      'Profile',
      'Source',
      'Date',
    ];

    const rows = leads.map((l) => [
      `"${(l.fullName || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phoneNumber || '').replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      `"${(l.designation || '').replace(/"/g, '""')}"`,
      `"${(l.interestedService || '').replace(/"/g, '""')}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.profileId?.username || ''}"`,
      `"${l.source}"`,
      `"${l.createdAt.toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tapzy-visitor-leads.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}
