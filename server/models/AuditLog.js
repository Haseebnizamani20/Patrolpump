const mongoose = require('mongoose');

/**
 * AuditLog — immutable record of all significant user actions.
 * Written by auditService.log() — errors are non-fatal.
 */
const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String, // denormalized so logs remain readable even if user is deleted
    },
    userRole: {
      type: String,
    },
    action: {
      type: String,
      enum: [
        'CREATE', 'UPDATE', 'DELETE', 'VOID',
        'LOGIN',
        'OPEN_DAY', 'CLOSE_DAY', 'REOPEN_DAY',
        'STOCK_ADJUST', 'SETUP',
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: [
        'Sale', 'Purchase', 'Payment', 'Expense',
        'SupplierPayment', 'StockAdjustment',
        'Customer', 'Supplier', 'Unit',
        'CashSession', 'User', 'Setup',
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      required: true,
    },
    // Extra data (amounts, names, etc.) for context — kept small
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // No timestamps: true — we manage timestamp manually so it stays in the document itself
    versionKey: false,
  }
);

// Compound index for efficient filtering by user + time
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
