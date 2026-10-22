import mongoose from 'mongoose';

const qrScanLogSchema = new mongoose.Schema(
  {
    qrCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QRCode',
      default: null,
      index: true,
    },
    publicCode: {
      type: String,
      required: true,
      index: true,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    deviceType: {
      type: String,
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
    country: {
      type: String,
      default: 'Unknown',
    },
    city: {
      type: String,
      default: 'Unknown',
    },
    redirectStatus: {
      type: String,
      enum: ['SUCCESS', 'UNASSIGNED', 'DISABLED', 'EXPIRED', 'INVALID_DESTINATION'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

qrScanLogSchema.index({ scannedAt: -1 });
qrScanLogSchema.index({ qrCodeId: 1, scannedAt: -1 });

export const QRScanLog = mongoose.model('QRScanLog', qrScanLogSchema);
