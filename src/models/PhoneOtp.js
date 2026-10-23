import mongoose from 'mongoose';

const phoneOtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '5m' }, // Auto-delete document after 5 minutes
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const PhoneOtp = mongoose.model('PhoneOtp', phoneOtpSchema);
