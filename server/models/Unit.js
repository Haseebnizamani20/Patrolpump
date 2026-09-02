const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 0,
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  avgCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active',
  },
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);
