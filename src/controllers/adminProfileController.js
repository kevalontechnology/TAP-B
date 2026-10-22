import { DigitalProfile } from '../models/DigitalProfile.js';
import { User } from '../models/User.js';
import { ProfileAnalyticsEvent } from '../models/ProfileAnalyticsEvent.js';
import { VisitorLead } from '../models/VisitorLead.js';
import { getActiveProfileBaseUrl } from '../utils/baseUrlHelper.js';
import { createProfileSchema, updateProfileSchema } from '../validators/profileValidator.js';
import { logAuditAction } from '../services/auditService.js';

/**
 * Format profile with public URL and computed telemetry metrics
 */
async function formatAdminProfile(profile, req) {
  const baseUrl = await getActiveProfileBaseUrl(req);
  const plain = profile.toObject ? profile.toObject() : { ...profile };
  plain.publicUrl = `${baseUrl}/${plain.username}`;

  // Calculate views baseline
  const baselineQuery = {
    profileId: plain._id,
    eventType: 'profile_view',
  };
  if (plain.statsResetBaseline) {
    baselineQuery.timestamp = { $gte: plain.statsResetBaseline };
  }

  const [totalViews, totalLeads] = await Promise.all([
    ProfileAnalyticsEvent.countDocuments(baselineQuery),
    VisitorLead.countDocuments({ profileId: plain._id }),
  ]);

  plain.totalViews = totalViews;
  plain.totalLeads = totalLeads;

  return plain;
}

/**
 * GET /api/admin/profiles
 * List all profiles across all users with search, pagination, and filters
 */
export async function listAllProfiles(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      visibility = '',
      companyName = '',
      userId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Status filter (Active / Inactive)
    if (status) {
      if (status.toUpperCase() === 'ACTIVE') query.isActive = true;
      if (status.toUpperCase() === 'INACTIVE') query.isActive = false;
    }

    // Visibility filter (Public / Private)
    if (visibility) {
      if (visibility.toUpperCase() === 'PUBLIC') query.isPublic = true;
      if (visibility.toUpperCase() === 'PRIVATE') query.isPublic = false;
    }

    // Company filter
    if (companyName && companyName.trim() !== '') {
      query.companyName = new RegExp(companyName.trim(), 'i');
    }

    // Specific Owner filter
    if (userId && userId.trim() !== '') {
      query.userId = userId;
    }

    // Multi-field search
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      // Also find users matching search to search by owner name or email
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { fullName: searchRegex },
        { username: searchRegex },
        { designation: searchRegex },
        { companyName: searchRegex },
        { mobileNumber: searchRegex },
        { email1: searchRegex },
        { userId: { $in: userIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [profiles, total, activeCount, inactiveCount, publicCount, privateCount] = await Promise.all([
      DigitalProfile.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email role phone'),
      DigitalProfile.countDocuments(query),
      DigitalProfile.countDocuments({ isActive: true }),
      DigitalProfile.countDocuments({ isActive: false }),
      DigitalProfile.countDocuments({ isPublic: true }),
      DigitalProfile.countDocuments({ isPublic: false }),
    ]);

    const formatted = await Promise.all(
      profiles.map((p) => formatAdminProfile(p, req))
    );

    return res.status(200).json({
      success: true,
      data: formatted,
      counts: {
        total,
        active: activeCount,
        inactive: inactiveCount,
        public: publicCount,
        private: privateCount,
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
 * GET /api/admin/profiles/:id
 * Retrieve profile details for Admin
 */
export async function getAdminProfileById(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id).populate('userId', 'name email role phone');

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    const formatted = await formatAdminProfile(profile, req);
    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/profiles
 * Admin creates profile and assigns owner
 */
export async function createAdminProfile(req, res, next) {
  try {
    const validated = createProfileSchema.parse(req.body);

    // Verify username uniqueness
    const normalizedUsername = validated.username.toLowerCase();
    const existing = await DigitalProfile.findOne({ username: normalizedUsername });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Username "${normalizedUsername}" is already taken. Please choose another username.`,
      });
    }

    // Determine target owner: Admin-assigned or fallback to admin self
    let targetUserId = req.user._id;
    if (validated.userId) {
      const ownerUser = await User.findById(validated.userId);
      if (!ownerUser) {
        return res.status(404).json({
          success: false,
          error: 'Assigned owner user not found in database',
        });
      }
      targetUserId = ownerUser._id;
    }

    // Check default status
    const userProfileCount = await DigitalProfile.countDocuments({ userId: targetUserId });
    const isDefault = userProfileCount === 0 || validated.isDefault;

    if (isDefault && userProfileCount > 0) {
      await DigitalProfile.updateMany({ userId: targetUserId }, { isDefault: false });
    }

    const newProfile = await DigitalProfile.create({
      ...validated,
      username: normalizedUsername,
      userId: targetUserId,
      isDefault,
    });

    await logAuditAction({
      action: 'ADMIN_CREATED_PROFILE',
      newValue: {
        profileId: newProfile._id,
        username: newProfile.username,
        ownerId: targetUserId,
      },
      performedBy: req.user._id,
    });

    const populated = await DigitalProfile.findById(newProfile._id).populate('userId', 'name email role phone');
    const formatted = await formatAdminProfile(populated, req);

    return res.status(201).json({
      success: true,
      message: 'Profile created successfully by Admin',
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/profiles/:id
 * Admin updates profile (all fields, owner change, visibility, active/inactive)
 */
export async function updateAdminProfile(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    const validated = updateProfileSchema.parse(req.body);

    // Username uniqueness check
    if (validated.username && validated.username.toLowerCase() !== profile.username) {
      const normalizedUsername = validated.username.toLowerCase();
      const existing = await DigitalProfile.findOne({
        username: normalizedUsername,
        _id: { $ne: profile._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Username "${normalizedUsername}" is already taken. Please choose another username.`,
        });
      }
      profile.username = normalizedUsername;
    }

    // Owner reassignment if requested
    if (validated.userId && validated.userId.toString() !== profile.userId.toString()) {
      const newOwner = await User.findById(validated.userId);
      if (!newOwner) {
        return res.status(404).json({
          success: false,
          error: 'Assigned new owner user not found',
        });
      }
      profile.userId = newOwner._id;
    }

    // If marked default, unset others for this owner
    if (validated.isDefault) {
      await DigitalProfile.updateMany(
        { userId: profile.userId, _id: { $ne: profile._id } },
        { isDefault: false }
      );
    }

    // Assign all other validated fields without overwriting unrelated fields
    Object.keys(validated).forEach((key) => {
      if (key !== 'username' && key !== 'userId' && validated[key] !== undefined) {
        profile[key] = validated[key];
      }
    });

    await profile.save();

    await logAuditAction({
      action: 'ADMIN_UPDATED_PROFILE',
      newValue: {
        profileId: profile._id,
        username: profile.username,
        ownerId: profile.userId,
      },
      performedBy: req.user._id,
    });

    const populated = await DigitalProfile.findById(profile._id).populate('userId', 'name email role phone');
    const formatted = await formatAdminProfile(populated, req);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully by Admin',
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/profiles/:id
 * Admin deletes profile
 */
export async function deleteAdminProfile(req, res, next) {
  try {
    const { id } = req.params;
    const profile = await DigitalProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    const oldValue = profile.toObject();
    await DigitalProfile.findByIdAndDelete(id);

    // Clean up analytics events & visitor leads
    await Promise.all([
      ProfileAnalyticsEvent.deleteMany({ profileId: id }),
      VisitorLead.deleteMany({ profileId: id }),
    ]);

    await logAuditAction({
      action: 'ADMIN_DELETED_PROFILE',
      oldValue: {
        profileId: id,
        username: oldValue.username,
        fullName: oldValue.fullName,
      },
      performedBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile and associated data deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
