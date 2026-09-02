const mongoose = require('mongoose');

const purchaseEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
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
  invoiceNo: {
    type: String,
    trim: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'pending'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseEntry', purchaseEntrySchema);
