const AuditLog = require('../models/AuditLog');

/**
 * auditService.log()
 *
 * Non-fatal helper — call from any controller after a successful action.
 * Never throws; errors are logged to console only.
 *
 * @param {object} user   - req.user (must have _id, name, role)
 * @param {string} action - AuditLog.action enum value
 * @param {string} entityType - AuditLog.entityType enum value
 * @param {string|null} entityId - MongoDB ObjectId of the affected document
 * @param {string} description - Human-readable one-liner (shown in UI)
 * @param {object} metadata - Optional extra data
 */
exports.log = async (user, action, entityType, entityId, description, metadata = {}, session = null) => {
  try {
    const entry = {
      timestamp: new Date(),
      userId: user?._id,
      userName: user?.name || user?.username || 'System',
      userRole: user?.role,
      action,
      entityType,
      entityId: entityId || undefined,
      description,
      metadata,
    };
    await AuditLog.create([entry], session ? { session } : undefined);
  } catch (err) {
    // Never block the main request flow
    console.error('[AuditLog] Failed to write log entry:', err.message);
  }
};
