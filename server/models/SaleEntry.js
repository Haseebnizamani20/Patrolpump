const mongoose = require('mongoose');

const saleEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true
  },
  paymentType: {
    type: String,
    enum: ['cash', 'credit', 'partial'],
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  costAtSale: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'voided'],
    default: 'active'
  },
  voidedAt: {
    type: Date
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voidReason: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('SaleEntry', saleEntrySchema);
