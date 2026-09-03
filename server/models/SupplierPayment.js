const mongoose = require('mongoose');

/**
 * SupplierPayment — records a payment made TO a supplier.
 * Reduces supplier.outstandingPayable on creation (handled in controller).
 */
const supplierPaymentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    mode: {
      type: String,
      enum: { values: ['cash', 'upi', 'bank'], message: 'Mode must be cash, upi, or bank' },
      required: [true, 'Payment mode is required'],
    },
    referenceNo: {
      type: String,
      trim: true,
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

module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);
