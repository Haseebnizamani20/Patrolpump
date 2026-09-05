const mongoose = require('mongoose');

/**
 * CashSession — one record per business day.
 *
 * Lifecycle: open → closed (→ reopened by owner if needed)
 *
 * Business rule BR-4: Closed days are immutable. No entries can be
 * added/edited on a closed day without the owner explicitly reopening it.
 */
const cashSessionSchema = new mongoose.Schema(
  {
    // Stored as midnight (00:00:00) of the session date for easy date-only lookup
    date: {
      type: Date,
      required: [true, 'Session date is required'],
      unique: true,
    },

    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },

    // Opening cash balance (cash in drawer at start of day)
    openingCash: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ---- Populated at close time by aggregating the day's transactions ----
    totalCashSales: {
      type: Number,
      default: 0,
    },
    totalCashPaymentsReceived: {
      type: Number,
      default: 0,
    },
    totalCashExpenses: {
      type: Number,
      default: 0,
    },
    totalCashPaidToSuppliers: {
      type: Number,
      default: 0,
    },

    // expectedCash = openingCash + cashSales + cashPaymentsReceived - cashExpenses - cashPaidToSuppliers
    expectedCash: {
      type: Number,
      default: 0,
    },

    // Actual cash counted by operator/owner at closing
    closingCash: {
      type: Number,
      default: 0,
      min: 0,
    },

    // shortageOrExcess = closingCash - expectedCash
    // Negative = shortage, Positive = excess
    shortageOrExcess: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
    },

    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closedAt: {
      type: Date,
    },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reopenedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for fast date lookups
cashSessionSchema.index({ date: 1 });

module.exports = mongoose.model('CashSession', cashSessionSchema);
