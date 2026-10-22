import mongoose from 'mongoose';

const visitorLeadSchema = new mongoose.Schema(
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
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },
    interestedService: {
      type: String,
      default: '',
      trim: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    consentGiven: {
      type: Boolean,
      required: true,
      default: true,
    },
    visitorId: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: ['public_profile', 'qr_code', 'nfc_card', 'direct'],
      default: 'public_profile',
    },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'CONVERTED', 'ARCHIVED'],
      default: 'NEW',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

visitorLeadSchema.index({ ownerId: 1, createdAt: -1 });
visitorLeadSchema.index({ profileId: 1, status: 1 });

export const VisitorLead = mongoose.model('VisitorLead', visitorLeadSchema);
