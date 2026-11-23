import crypto from 'crypto';
import useragent from 'useragent';
import { DigitalProfile } from '../models/DigitalProfile.js';
import { ProfileAnalyticsEvent } from '../models/ProfileAnalyticsEvent.js';
import { VisitorLead } from '../models/VisitorLead.js';
import { buildVCardString } from './profileController.js';
import { getActiveProfileBaseUrl } from '../utils/baseUrlHelper.js';
import {
  renderProfileHtml,
  renderProfileNotFoundHtml,
  renderProfileUnavailableHtml,
} from '../utils/renderProfilePage.js';

/**
 * Generate privacy-preserving visitor identifier from IP + User Agent salt
 * Never stores or exposes raw IP address
 */
function getPrivacyVisitorId(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const salt = process.env.JWT_SECRET || 'kevalon-visitor-salt';
  return crypto.createHash('sha256').update(`${ip}-${ua}-${salt}`).digest('hex').substring(0, 16);
}

/**
 * Categorize device from User-Agent
 */
function getDeviceCategory(uaString) {
  if (!uaString) return 'Unknown';
  const lower = uaString.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(lower)) return 'Tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(lower)) return 'Mobile';
  return 'Desktop';
}

/**
 * GET /api/public/profile/:username
 * Retrieve public digital profile data
 */
export async function getPublicProfileData(req, res, next) {
  try {
    const { username } = req.params;
    const profile = await DigitalProfile.findOne({
      username: username.toLowerCase(),
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
    }

    if (!profile.isActive || !profile.isPublic) {
      return res.status(403).json({
        success: false,
        error: 'This profile is currently private or inactive',
      });
    }

    const baseUrl = await getActiveProfileBaseUrl(req);

    return res.status(200).json({
      success: true,
      data: {
        id: profile._id,
        username: profile.username,
        fullName: profile.fullName,
        designation: profile.designation,
        bio: profile.bio,
        profilePhoto: profile.profilePhoto,
        mobileNumber: profile.mobileNumber,
        whatsappNumber: profile.whatsappNumber,
        email1: profile.email1,
        email2: profile.email2,
        alternatePhone: profile.alternatePhone,
        companyName: profile.companyName,
        companyLogo: profile.companyLogo,
        industry: profile.industry,
        companyDescription: profile.companyDescription,
        companyWebsite: profile.companyWebsite,
        companyAddress: profile.companyAddress,
        googleMapsLocation: profile.googleMapsLocation,
        socialLinks: {
          linkedIn: profile.linkedIn,
          instagram: profile.instagram,
          facebook: profile.facebook,
          youtube: profile.youtube,
          twitter: profile.twitter,
          github: profile.github,
          portfolio: profile.portfolio,
          googleReview: profile.googleReview,
          customLinks: profile.customLinks,
        },
        services: profile.services,
        products: profile.products,
        portfolioItems: profile.portfolioItems,
        imageGallery: profile.imageGallery,
        brochureUrl: profile.brochureUrl,
        themeColor: profile.themeColor || '#034665',
        saveContactVcf: profile.saveContactVcf,
        publicUrl: `${baseUrl}/${profile.username}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /:username or GET /p/:username
 * Renders complete server-side HTML Digital Business Card for browsers,
 * or returns JSON for API consumers
 */
export async function handlePublicProfileView(req, res, next) {
  try {
    const { username } = req.params;
    if (!username) return next();

    // Check if client explicitly requests JSON (API client or fetch)
    const acceptsHtml = req.accepts ? req.accepts(['html', 'json']) === 'html' : true;
    const isApiRequest =
      req.path.startsWith('/api/') ||
      (!acceptsHtml && req.headers.accept && req.headers.accept.includes('application/json'));

    const profile = await DigitalProfile.findOne({
      username: username.toLowerCase(),
    });

    if (!profile) {
      if (isApiRequest) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(renderProfileNotFoundHtml({ username }));
    }

    if (!profile.isActive) {
      if (isApiRequest) {
        return res.status(403).json({ success: false, error: 'This profile is currently inactive' });
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(403).send(renderProfileUnavailableHtml({ username, reason: 'inactive' }));
    }

    if (!profile.isPublic) {
      if (isApiRequest) {
        return res.status(403).json({ success: false, error: 'This profile is currently private' });
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(403).send(renderProfileUnavailableHtml({ username, reason: 'private' }));
    }

    const baseUrl = await getActiveProfileBaseUrl(req);
    const publicUrl = `${baseUrl}/${profile.username}`;
    const vcfUrl = `/p/${profile.username}/vcf`;

    if (isApiRequest) {
      return res.status(200).json({
        success: true,
        data: {
          id: profile._id,
          username: profile.username,
          fullName: profile.fullName,
          designation: profile.designation,
          bio: profile.bio,
          profilePhoto: profile.profilePhoto,
          mobileNumber: profile.mobileNumber,
          whatsappNumber: profile.whatsappNumber,
          email1: profile.email1,
          email2: profile.email2,
          alternatePhone: profile.alternatePhone,
          companyName: profile.companyName,
          companyLogo: profile.companyLogo,
          industry: profile.industry,
          companyDescription: profile.companyDescription,
          companyWebsite: profile.companyWebsite,
          companyAddress: profile.companyAddress,
          googleMapsLocation: profile.googleMapsLocation,
          socialLinks: {
            linkedIn: profile.linkedIn,
            instagram: profile.instagram,
            facebook: profile.facebook,
            youtube: profile.youtube,
            twitter: profile.twitter,
            github: profile.github,
            portfolio: profile.portfolio,
            googleReview: profile.googleReview,
            customLinks: profile.customLinks,
          },
          services: profile.services,
          products: profile.products,
          portfolioItems: profile.portfolioItems,
          imageGallery: profile.imageGallery,
          brochureUrl: profile.brochureUrl,
          themeColor: profile.themeColor || '#034665',
          saveContactVcf: profile.saveContactVcf,
          publicUrl,
        },
      });
    }

    // Render Full Ultra-Responsive HTML Digital Profile
    const profileData = profile.toObject ? profile.toObject() : profile;
    const html = renderProfileHtml({
      profile: {
        ...profileData,
        socialLinks: {
          linkedIn: profile.linkedIn,
          instagram: profile.instagram,
          facebook: profile.facebook,
          youtube: profile.youtube,
          twitter: profile.twitter,
          github: profile.github,
          portfolio: profile.portfolio,
          googleReview: profile.googleReview,
          customLinks: profile.customLinks,
        },
      },
      publicUrl,
      vcfUrl,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/profile/:username/track-view
 * Record anonymous/consented profile view event
 */
export async function trackProfileView(req, res, next) {
  try {
    const { username } = req.params;
    const { referralSource = 'direct' } = req.body;

    const profile = await DigitalProfile.findOne({
      username: username.toLowerCase(),
    });

    if (!profile || !profile.isActive || !profile.isPublic) {
      return res.status(200).json({ success: true, recorded: false });
    }

    const ua = useragent.parse(req.headers['user-agent'] || '');
    const deviceCategory = getDeviceCategory(req.headers['user-agent']);
    const visitorId = getPrivacyVisitorId(req);

    // Approximate location from headers if provided by reverse proxy/Cloudflare
    const country = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'Unknown';
    const city = req.headers['cf-ipcity'] || req.headers['x-city'] || 'Unknown';

    await ProfileAnalyticsEvent.create({
      profileId: profile._id,
      ownerId: profile.userId,
      eventType: 'profile_view',
      platform: 'kevalon_profile',
      referralSource: [
        'qr_scan',
        'qr_code',
        'nfc_tap',
        'nfc_card',
        'social',
        'website',
        'public_profile',
        'direct',
      ].includes(referralSource)
        ? referralSource
        : 'direct',
      deviceCategory,
      browser: ua.family || 'Unknown',
      operatingSystem: ua.os.family || 'Unknown',
      approximateLocation: { country, city },
      visitorId,
    });

    return res.status(200).json({ success: true, recorded: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /t/link/:profileId/:platform
 * Track social link click and redirect (HTTP 302) to target destination
 */
export async function trackLinkAndRedirect(req, res, next) {
  try {
    const { profileId, platform } = req.params;
    const { linkId, src = 'direct' } = req.query;

    const profile = await DigitalProfile.findById(profileId);
    if (!profile) {
      return res.status(404).send('Profile not found');
    }

    let destinationUrl = '';
    const platKey = platform.toLowerCase();

    if (platKey === 'whatsapp') {
      const num = profile.whatsappNumber || profile.mobileNumber;
      destinationUrl = num ? `https://wa.me/${num.replace(/[^0-9]/g, '')}` : profile.website || '';
    } else if (platKey === 'phone') {
      const num = profile.mobileNumber || profile.alternatePhone;
      destinationUrl = num ? `tel:${num}` : '';
    } else if (platKey === 'email') {
      const em = profile.email1 || profile.email2;
      destinationUrl = em ? `mailto:${em}` : '';
    } else if (profile[platKey]) {
      destinationUrl = profile[platKey];
    } else if (platKey === 'custom' && linkId && profile.customLinks) {
      const custom = profile.customLinks.find((l) => l.id === linkId);
      if (custom) destinationUrl = custom.url;
    }

    if (!destinationUrl) {
      return res.status(400).send('Link not configured on this profile');
    }

    const ua = useragent.parse(req.headers['user-agent'] || '');
    const deviceCategory = getDeviceCategory(req.headers['user-agent']);
    const visitorId = getPrivacyVisitorId(req);
    const country = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'Unknown';
    const city = req.headers['cf-ipcity'] || req.headers['x-city'] || 'Unknown';

    // Record click event
    await ProfileAnalyticsEvent.create({
      profileId: profile._id,
      ownerId: profile.userId,
      eventType: 'link_click',
      platform: platKey,
      linkId: linkId || '',
      destinationUrl,
      referralSource: ['qr_scan', 'nfc_tap', 'social', 'website', 'direct'].includes(src)
        ? src
        : 'direct',
      deviceCategory,
      browser: ua.family || 'Unknown',
      operatingSystem: ua.os.family || 'Unknown',
      approximateLocation: { country, city },
      visitorId,
    });

    // 302 Found redirect with anti-cache headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return res.redirect(302, destinationUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/profile/:username/connect
 * Voluntary consent-based visitor contact form submission
 */
export async function submitContactLead(req, res, next) {
  try {
    const { username } = req.params;
    const {
      fullName,
      companyName,
      designation,
      email,
      phoneNumber,
      interestedService,
      message,
      consentGiven,
      source = 'public_profile',
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (min 2 characters)' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }

    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        error: 'Consent is required to submit contact details',
      });
    }

    const profile = await DigitalProfile.findOne({
      username: username.toLowerCase(),
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const visitorId = getPrivacyVisitorId(req);
    const ua = useragent.parse(req.headers['user-agent'] || '');
    const deviceCategory = getDeviceCategory(req.headers['user-agent']);

    // Prevent duplicate lead entries for the exact same mobile number
    if (phoneNumber && phoneNumber.trim()) {
      const cleanPhone = phoneNumber.trim();
      const existingLead = await VisitorLead.findOne({
        profileId: profile._id,
        phoneNumber: cleanPhone,
      });
      if (existingLead) {
        existingLead.fullName = fullName.trim();
        if (email) existingLead.email = email.trim().toLowerCase();
        if (message) existingLead.message = message.trim();
        existingLead.updatedAt = new Date();
        await existingLead.save();

        return res.status(200).json({
          success: true,
          message: 'Contact inquiry updated successfully',
          data: { leadId: existingLead._id },
        });
      }
    }

    const lead = await VisitorLead.create({
      profileId: profile._id,
      ownerId: profile.userId,
      fullName: fullName.trim(),
      companyName: (companyName || '').trim(),
      designation: (designation || '').trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: (phoneNumber || '').trim(),
      interestedService: (interestedService || '').trim(),
      message: (message || '').trim(),
      consentGiven: true,
      visitorId,
      source: ['public_profile', 'qr_code', 'nfc_card', 'direct'].includes(source)
        ? source
        : 'public_profile',
      status: 'NEW',
    });

    // Record submission event
    await ProfileAnalyticsEvent.create({
      profileId: profile._id,
      ownerId: profile.userId,
      eventType: 'contact_form_submitted',
      platform: 'lead_form',
      destinationUrl: '',
      referralSource: lead.source,
      deviceCategory,
      browser: ua.family || 'Unknown',
      operatingSystem: ua.os.family || 'Unknown',
      consentStatus: true,
      visitorId,
      leadId: lead._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your contact details have been shared successfully.',
      data: {
        id: lead._id,
        fullName: lead.fullName,
        email: lead.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /p/:username/vcf
 * Public VCF download for visitors
 */
export async function downloadPublicVcf(req, res, next) {
  try {
    const { username } = req.params;
    const profile = await DigitalProfile.findOne({
      username: username.toLowerCase(),
    });

    if (!profile || !profile.isActive || !profile.isPublic) {
      return res.status(404).send('Profile not found or inactive');
    }

    const baseUrl = await getActiveProfileBaseUrl(req);
    const publicUrl = `${baseUrl}/${profile.username}`;
    const vcard = buildVCardString(profile, publicUrl);

    // Track VCF download event
    const visitorId = getPrivacyVisitorId(req);
    const ua = useragent.parse(req.headers['user-agent'] || '');
    const deviceCategory = getDeviceCategory(req.headers['user-agent']);

    await ProfileAnalyticsEvent.create({
      profileId: profile._id,
      ownerId: profile.userId,
      eventType: 'vcf_download',
      platform: 'vcf',
      destinationUrl: '',
      referralSource: 'direct',
      deviceCategory,
      browser: ua.family || 'Unknown',
      operatingSystem: ua.os.family || 'Unknown',
      visitorId,
    });

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${profile.username}.vcf"`);
    return res.status(200).send(vcard);
  } catch (err) {
    next(err);
  }
}
