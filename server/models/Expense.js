const mongoose = require('mongoose');

/**
 * Expense — records a daily operating expense.
 * Cash-mode expenses feed into the day's Cash Register calculation (Phase 6).
 */
const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    mode: {
      type: String,
      enum: {
        values: ['cash', 'bank'],
        message: 'Mode must be cash or bank',
      },
      required: [true, 'Mode is required'],
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
