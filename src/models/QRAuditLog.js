import mongoose from 'mongoose';

const qrAuditLogSchema = new mongoose.Schema(
  {
    qrCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QRCode',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: ['CREATED', 'ASSIGNED', 'DESTINATION_UPDATED', 'STATUS_CHANGED', 'DELETED', 'BULK_GENERATED', 'ACTIVATION_REQUESTED'],
      required: true,
      index: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

qrAuditLogSchema.index({ performedAt: -1 });
qrAuditLogSchema.index({ qrCodeId: 1, performedAt: -1 });

export const QRAuditLog = mongoose.model('QRAuditLog', qrAuditLogSchema);
