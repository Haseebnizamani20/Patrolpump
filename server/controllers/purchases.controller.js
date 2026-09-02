const PurchaseEntry = require('../models/PurchaseEntry');
const Supplier = require('../models/Supplier');
const Unit = require('../models/Unit');
const stockService = require('../services/stockService');

exports.getPurchases = async (req, res, next) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    let query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (supplierId) {
      query.supplierId = supplierId;
    }

    const purchases = await PurchaseEntry.find(query)
      .populate('supplierId', 'name')
      .populate('unitId', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    next(error);
  }
};

exports.createPurchase = async (req, res, next) => {
  let stockUpdated = false;
  let supplierUpdated = false;
  let previousStock;
  let previousAvgCost;
  let previousPayable;
  try {
    const { supplierId, unitId, quantity, rate, paymentStatus = 'pending', amountPaid = 0, invoiceNo, notes, ownerOverride, date } = req.body;
    
    if (!supplierId || !unitId || quantity == null || rate == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !Number.isFinite(Number(rate)) || Number(rate) < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero and rate cannot be negative' });
    }

    if (!['paid', 'partial', 'pending'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    if (!Number.isFinite(Number(amountPaid)) || Number(amountPaid) < 0) {
      return res.status(400).json({ success: false, message: 'Amount paid cannot be negative' });
    }

    const normalizedQuantity = Number(quantity);
    const normalizedRate = Number(rate);
    const normalizedAmountPaid = Math.round(Number(amountPaid) * 100) / 100;
    const amount = Math.round(normalizedQuantity * normalizedRate * 100) / 100;

    if ((paymentStatus === 'paid' && normalizedAmountPaid !== amount) ||
        (paymentStatus === 'partial' && (normalizedAmountPaid <= 0 || normalizedAmountPaid >= amount)) ||
        (paymentStatus === 'pending' && normalizedAmountPaid !== 0)) {
      return res.status(400).json({ success: false, message: 'Amount paid does not match payment status' });
    }
    
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    previousStock = unit.currentStock;
    previousAvgCost = unit.avgCost;
    
    if (unit.capacity && (unit.currentStock + normalizedQuantity > unit.capacity)) {
      if (!(ownerOverride === true && req.user.role === 'owner')) {
        return res.status(400).json({ success: false, code: 'CAPACITY_EXCEEDED', message: 'Adding quantity would exceed unit capacity' });
      }
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    previousPayable = supplier.outstandingPayable;

    await stockService.addStock(unitId, normalizedQuantity, normalizedRate, ownerOverride === true && req.user.role === 'owner');
    stockUpdated = true;

    if (paymentStatus === 'pending') {
      supplier.outstandingPayable += amount;
    } else if (paymentStatus === 'partial') {
      supplier.outstandingPayable += (amount - normalizedAmountPaid);
    }
    // if 'paid', supplier.outstandingPayable remains unchanged
    await supplier.save();
    supplierUpdated = true;

    const purchase = new PurchaseEntry({
      date: date ? new Date(date) : Date.now(),
      supplierId,
      unitId,
      quantity,
      rate,
      amount,
      invoiceNo,
      paymentStatus,
      amountPaid: normalizedAmountPaid,
      notes
    });

    await purchase.save();

    res.status(201).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    if (supplierUpdated) {
      const supplier = await Supplier.findById(req.body.supplierId || req.body.supplier);
      if (supplier) {
        supplier.outstandingPayable = previousPayable;
        await supplier.save();
      }
    }
    if (stockUpdated) {
      await stockService.restoreStockState(req.body.unitId || req.body.unit, previousStock, previousAvgCost);
    }
    next(error);
  }
};

exports.getPurchase = async (req, res, next) => {
  try {
    const purchase = await PurchaseEntry.findById(req.params.id)
      .populate('supplierId', 'name')
      .populate('unitId', 'name');
      
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};
