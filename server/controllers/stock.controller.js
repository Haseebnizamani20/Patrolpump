const StockAdjustment = require('../models/StockAdjustment');
const stockService = require('../services/stockService');

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

    const updatedUnit = await stockService.adjustStock(unitId, type, Number(quantity));

    const adjustment = new StockAdjustment({
      unitId,
      type,
      quantity,
      reason,
      adjustedBy: req.user._id
    });

    await adjustment.save();

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
