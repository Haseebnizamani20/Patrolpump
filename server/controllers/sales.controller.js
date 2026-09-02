const SaleEntry = require('../models/SaleEntry');
const Customer = require('../models/Customer');
const Unit = require('../models/Unit');
const stockService = require('../services/stockService');
const ledgerService = require('../services/ledgerService');

exports.getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, customerId, unitId, status } = req.query;
    let query = {};
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (customerId) query.customerId = customerId;
    if (unitId) query.unitId = unitId;
    if (status) query.status = status;

    const sales = await SaleEntry.find(query)
      .populate('customerId', 'name')
      .populate('unitId', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

exports.createSale = async (req, res, next) => {
  let balanceAdded = false;
  let stockRemoved = false;
  let mutationCustomerId;
  let mutationUnitId;
  let mutationQuantity;
  let mutationDueAmount = 0;
  try {
    let { customerId, unitId, quantity, rate, paymentType, amountPaid, ownerOverride, date } = req.body;
    mutationCustomerId = customerId;
    mutationUnitId = unitId;
    
    if (!customerId || !unitId || quantity == null || rate == null || !paymentType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !Number.isFinite(Number(rate)) || Number(rate) < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero and rate cannot be negative' });
    }

    if (!['cash', 'credit', 'partial'].includes(paymentType)) {
      return res.status(400).json({ success: false, message: 'Invalid payment type' });
    }

    quantity = Number(quantity);
    rate = Number(rate);
    amountPaid = Math.round(Number(amountPaid || 0) * 100) / 100;
    const amount = Math.round(quantity * rate * 100) / 100;
    
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    
    if (unit.currentStock < quantity) {
      if (!(ownerOverride === true && req.user.role === 'owner')) {
        return res.status(400).json({ success: false, code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock available' });
      }
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let dueAmount = 0;
    let finalAmountPaid = 0;

    if (customer.type === 'retail' && paymentType !== 'cash') {
      return res.status(400).json({ success: false, message: 'Retail customers can only make cash payments' });
    }

    if (paymentType === 'cash') {
      finalAmountPaid = amount;
      dueAmount = 0;
    } else if (paymentType === 'credit') {
      finalAmountPaid = 0;
      dueAmount = amount;
    } else if (paymentType === 'partial') {
      finalAmountPaid = amountPaid;
      dueAmount = Math.round((amount - finalAmountPaid) * 100) / 100;
    }

    if (finalAmountPaid < 0 || dueAmount < 0 || (paymentType === 'partial' && finalAmountPaid <= 0)) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    let warningResponse = null;
    if (customer.type === 'credit' && customer.creditLimit && (customer.currentBalance + dueAmount > customer.creditLimit)) {
      warningResponse = { creditLimitWarning: true, message: 'This sale exceeds credit limit' };
    }

    const costAtSale = unit.avgCost || 0;

    if (dueAmount > 0) {
      await ledgerService.addToBalance(customerId, dueAmount);
      balanceAdded = true;
      mutationDueAmount = dueAmount;
    }
    
    await stockService.removeStock(unitId, quantity, ownerOverride === true && req.user.role === 'owner');
    stockRemoved = true;
    mutationQuantity = quantity;

    const sale = new SaleEntry({
      date: date ? new Date(date) : Date.now(),
      customerId,
      unitId,
      quantity,
      rate,
      amount,
      paymentType,
      amountPaid: finalAmountPaid,
      dueAmount,
      costAtSale
    });

    await sale.save();

    res.status(201).json({
      success: true,
      data: sale,
      ...(warningResponse && warningResponse)
    });
  } catch (error) {
    if (stockRemoved) {
      await stockService.reverseStockRemoval(mutationUnitId, mutationQuantity);
    }
    if (balanceAdded) {
      await ledgerService.reverseBalance(mutationCustomerId, mutationDueAmount);
    }
    next(error);
  }
};

exports.getSale = async (req, res, next) => {
  try {
    const sale = await SaleEntry.findById(req.params.id)
      .populate('customerId', 'name')
      .populate('unitId', 'name')
      .populate('voidedBy', 'name');
      
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

exports.voidSale = async (req, res, next) => {
  let stockReversed = false;
  let balanceReversed = false;
  let mutationSale;
  try {
    const { voidReason } = req.body;
    if (!voidReason) {
      return res.status(400).json({ success: false, message: 'Void reason is required' });
    }

    const sale = await SaleEntry.findById(req.params.id);
    mutationSale = sale;
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    
    if (sale.status === 'voided') {
      return res.status(400).json({ success: false, message: 'Sale is already voided' });
    }

    await stockService.reverseStockRemoval(sale.unitId, sale.quantity);
    stockReversed = true;

    if (sale.dueAmount > 0) {
      await ledgerService.reverseBalance(sale.customerId, sale.dueAmount);
      balanceReversed = true;
    }

    sale.status = 'voided';
    sale.voidedAt = new Date();
    sale.voidedBy = req.user._id;
    sale.voidReason = voidReason;

    await sale.save();

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    if (balanceReversed) {
      await ledgerService.addToBalance(mutationSale.customerId, mutationSale.dueAmount);
    }
    if (stockReversed) {
      await stockService.removeStock(mutationSale.unitId, mutationSale.quantity);
    }
    next(error);
  }
};
