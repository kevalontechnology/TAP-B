import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema(
  {
    publicCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    shortUrl: {
      type: String,
      default: '',
    },
    destinationType: {
      type: String,
      enum: ['WEBSITE', 'TAPZY_PROFILE', 'KEVALON_PROFILE', 'CUSTOM_DATA'],
      default: 'KEVALON_PROFILE',
    },
    destinationUrl: {
      type: String,
      default: '',
      trim: true,
    },
    customData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ['UNASSIGNED', 'ACTIVE', 'DISABLED', 'EXPIRED'],
      default: 'UNASSIGNED',
      index: true,
    },
    assignedTo: {
      customerName: { type: String, default: '', trim: true },
      mobileNumber: { type: String, default: '', trim: true },
      customerRefId: { type: String, default: '', trim: true },
      note: { type: String, default: '', trim: true },
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    batchId: {
      type: String,
      default: null,
      index: true,
    },
    scanCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    style: {
      fgColor: { type: String, default: '#000000' },
      bgColor: { type: String, default: '#FFFFFF' },
      logoUrl: { type: String, default: '' },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

qrCodeSchema.index({ createdAt: -1 });
qrCodeSchema.index({ status: 1, batchId: 1 });
qrCodeSchema.index({ 'assignedTo.customerName': 1 });

export const QRCode = mongoose.model('QRCode', qrCodeSchema);
