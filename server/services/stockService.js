const Unit = require('../models/Unit');

exports.addStock = async (unitId, quantity, rate, allowOverCapacity = false) => {
  const unit = await Unit.findById(unitId);
  if (!unit) throw new Error('Unit not found');

  if (!allowOverCapacity && unit.capacity && unit.currentStock + quantity > unit.capacity) {
    throw new Error('Stock addition exceeds unit capacity');
  }

  const oldStock = unit.currentStock || 0;
  const oldAvgCost = unit.avgCost || 0;
  const newAvgCost = (oldStock * oldAvgCost + quantity * rate) / (oldStock + quantity);

  unit.avgCost = Math.round(newAvgCost * 100) / 100;
  unit.currentStock += quantity;

  return await unit.save();
};

exports.removeStock = async (unitId, quantity, allowNegative = false) => {
  const unit = await Unit.findById(unitId);
  if (!unit) throw new Error('Unit not found');

  if (!allowNegative && unit.currentStock < quantity) {
    throw new Error('Insufficient stock available');
  }

  unit.currentStock -= quantity;
  return await unit.save();
};

exports.reverseStockRemoval = async (unitId, quantity) => {
  const unit = await Unit.findById(unitId);
  if (!unit) throw new Error('Unit not found');

  unit.currentStock += quantity;
  return await unit.save();
};

exports.restoreStockState = async (unitId, currentStock, avgCost) => {
  const unit = await Unit.findById(unitId);
  if (!unit) throw new Error('Unit not found');

  unit.currentStock = currentStock;
  unit.avgCost = avgCost;
  return await unit.save();
};

exports.adjustStock = async (unitId, type, quantity) => {
  const unit = await Unit.findById(unitId);
  if (!unit) throw new Error('Unit not found');

  if (type === 'shortage') {
    if (unit.currentStock < quantity) {
      throw new Error('Insufficient stock available for shortage adjustment');
    }
    unit.currentStock -= quantity;
  } else if (type === 'excess') {
    if (unit.capacity && unit.currentStock + quantity > unit.capacity) {
      throw new Error('Adjustment exceeds unit capacity');
    }
    unit.currentStock += quantity;
  } else {
    throw new Error('Invalid adjustment type');
  }

  return await unit.save();
};
