const AuditLog = require('../models/AuditLog');

/**
 * GET /api/audit-log
 * Returns audit log entries, newest first.
 * Filters: userId, action, entityType, startDate, endDate.
 */
exports.getAuditLog = async (req, res, next) => {
  try {
    const { userId, action, entityType, startDate, endDate } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(500); // hard cap to avoid huge payloads

    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    next(error);
  }
};
