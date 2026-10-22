import mongoose from 'mongoose';

const qrRequestSchema = new mongoose.Schema(
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
    requesterName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

qrRequestSchema.index({ createdAt: -1 });

export const QRRequest = mongoose.model('QRRequest', qrRequestSchema);
