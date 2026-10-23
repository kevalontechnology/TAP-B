import mongoose from 'mongoose';

const customLinkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    platform: { type: String, default: 'custom' },
    icon: { type: String, default: 'globe' },
  },
  { _id: false }
);

const serviceItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: String, default: '', trim: true },
    icon: { type: String, default: 'briefcase' },
  },
  { _id: false }
);

const productItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    link: { type: String, default: '' },
  },
  { _id: false }
);

const portfolioItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    link: { type: String, default: '' },
  },
  { _id: false }
);

const galleryItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    caption: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const digitalProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Profile Classification Type
    profileType: {
      type: String,
      enum: ['PERSONAL', 'BUSINESS', 'EMPLOYEE', 'CUSTOM'],
      default: 'CUSTOM',
      index: true,
    },
    // Company Code for Organization / Employee linking
    companyCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      index: true,
    },
    // Personal Information
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z0-9_-]{3,30}$/, 'Username must be 3-30 lowercase alphanumeric characters, dashes or underscores'],
    },
    mobileNumber: {
      type: String,
      default: '',
      trim: true,
    },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
    },
    email1: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    email2: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    alternatePhone: {
      type: String,
      default: '',
      trim: true,
    },

    // Company Information
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    companyLogo: {
      type: String,
      default: '',
    },
    industry: {
      type: String,
      default: '',
      trim: true,
    },
    companyDescription: {
      type: String,
      default: '',
      trim: true,
    },
    companyWebsite: {
      type: String,
      default: '',
      trim: true,
    },
    companyAddress: {
      type: String,
      default: '',
      trim: true,
    },
    googleMapsLocation: {
      type: String,
      default: '',
      trim: true,
    },

    // Social Media Links
    linkedIn: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },
    facebook: { type: String, default: '', trim: true },
    youtube: { type: String, default: '', trim: true },
    twitter: { type: String, default: '', trim: true },
    github: { type: String, default: '', trim: true },
    portfolio: { type: String, default: '', trim: true },
    googleReview: { type: String, default: '', trim: true },
    customLinks: {
      type: [customLinkSchema],
      default: [],
    },

    // Business Content
    services: {
      type: [serviceItemSchema],
      default: [],
    },
    products: {
      type: [productItemSchema],
      default: [],
    },
    portfolioItems: {
      type: [portfolioItemSchema],
      default: [],
    },
    imageGallery: {
      type: [galleryItemSchema],
      default: [],
    },
    brochureUrl: {
      type: String,
      default: '',
      trim: true,
    },

    // Profile Settings
    saveContactVcf: {
      type: Boolean,
      default: true,
    },
    themeColor: {
      type: String,
      default: '#034665',
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    statsResetBaseline: {
      type: Date,
      default: null,
    },
    // Card & NFC Integration
    cardLinked: {
      type: Boolean,
      default: false,
      index: true,
    },
    cardLinkedAt: {
      type: Date,
      default: null,
    },
    cardNumber: {
      type: String,
      default: '',
      trim: true,
    },
    cardNickname: {
      type: String,
      default: '',
      trim: true,
    },
    nfcUid: {
      type: String,
      default: '',
      trim: true,
    },
    linkedQrCode: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

digitalProfileSchema.index({ userId: 1, createdAt: -1 });
digitalProfileSchema.index({ isActive: 1, isPublic: 1 });
digitalProfileSchema.index(
  { mobileNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { mobileNumber: { $gt: '' } },
  }
);

export const DigitalProfile = mongoose.model('DigitalProfile', digitalProfileSchema);
