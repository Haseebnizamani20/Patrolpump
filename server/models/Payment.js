const mongoose = require('mongoose');

/**
 * Payment — records a payment collected from a credit customer.
 * Reduces the customer's currentBalance on save (handled in controller).
 */
const paymentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    mode: {
      type: String,
      enum: {
        values: ['cash', 'upi', 'bank'],
        message: 'Mode must be cash, upi, or bank',
      },
      required: [true, 'Payment mode is required'],
    },
    notes: {
      type: String,
      trim: true,
    },
    // Reference back to what reduced the balance — useful for audit
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
