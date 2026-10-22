import { QRAuditLog } from '../models/QRAuditLog.js';

/**
 * Record an audit log entry for actions on QR codes
 */
export async function logAuditAction({
  qrCodeId = null,
  action,
  oldValue = null,
  newValue = null,
  performedBy = null,
}) {
  try {
    await QRAuditLog.create({
      qrCodeId,
      action,
      oldValue,
      newValue,
      performedBy,
      performedAt: new Date(),
    });
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
  }
}
