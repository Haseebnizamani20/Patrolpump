const StockAdjustment = require('../models/StockAdjustment');
const stockService = require('../services/stockService');
const { runAtomic } = require('../services/transactionService');

exports.getStockAdjustments = async (req, res, next) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate('unitId', 'name')
      .populate('adjustedBy', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: adjustments
    });
  } catch (error) {
    next(error);
  }
};

exports.createStockAdjustment = async (req, res, next) => {
  try {
    const { unitId, type, quantity, reason } = req.body;
    
    if (!unitId || !type || quantity == null || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
    }

    const { updatedUnit, adjustment } = await runAtomic(async (session) => {
      const unit = await stockService.adjustStock(unitId, type, Number(quantity), session);
      const createdAdjustment = new StockAdjustment({ unitId, type, quantity, reason, adjustedBy: req.user._id });
      await createdAdjustment.save(session ? { session } : undefined);
      return { updatedUnit: unit, adjustment: createdAdjustment };
    });

    res.status(201).json({
      success: true,
      data: {
        adjustment,
        unit: updatedUnit
      }
    });
  } catch (error) {
    next(error);
  }
};
