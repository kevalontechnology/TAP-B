import mongoose from 'mongoose';

const profileAnalyticsEventSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DigitalProfile',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'profile_view',
        'link_click',
        'vcf_download',
        'contact_form_submitted',
        'profile_shared',
      ],
      required: true,
      index: true,
    },
    platform: {
      type: String,
      default: '',
      index: true,
    },
    linkId: {
      type: String,
      default: '',
    },
    destinationUrl: {
      type: String,
      default: '',
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    referralSource: {
      type: String,
      enum: [
        'direct',
        'qr_scan',
        'qr_code',
        'nfc_tap',
        'nfc_card',
        'social',
        'website',
        'public_profile',
        'other',
      ],
      default: 'direct',
    },
    deviceCategory: {
      type: String,
      enum: ['Mobile', 'Tablet', 'Desktop', 'Unknown'],
      default: 'Unknown',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    operatingSystem: {
      type: String,
      default: 'Unknown',
    },
    approximateLocation: {
      country: { type: String, default: 'Unknown' },
      city: { type: String, default: 'Unknown' },
    },
    consentStatus: {
      type: Boolean,
      default: false,
    },
    visitorId: {
      type: String,
      default: '',
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisitorLead',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

profileAnalyticsEventSchema.index({ profileId: 1, timestamp: -1 });
profileAnalyticsEventSchema.index({ ownerId: 1, timestamp: -1 });
profileAnalyticsEventSchema.index({ profileId: 1, eventType: 1, timestamp: -1 });
profileAnalyticsEventSchema.index({ profileId: 1, platform: 1, timestamp: -1 });

export const ProfileAnalyticsEvent = mongoose.model(
  'ProfileAnalyticsEvent',
  profileAnalyticsEventSchema
);
