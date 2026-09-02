const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  type: {
    type: String,
    enum: ['shortage', 'excess'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  reason: {
    type: String,
    required: true
  },
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
