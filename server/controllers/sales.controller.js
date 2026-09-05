const SaleEntry = require('../models/SaleEntry');
const Customer = require('../models/Customer');
const Unit = require('../models/Unit');
const stockService = require('../services/stockService');
const ledgerService = require('../services/ledgerService');
const auditService = require('../services/auditService');
const { runAtomic } = require('../services/transactionService');

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
  try {
    let { customerId, unitId, quantity, rate, paymentType, amountPaid, ownerOverride, date } = req.body;
    
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
    
    const { sale, warningResponse } = await runAtomic(async (session) => {
      const unit = await Unit.findById(unitId).session(session);
      if (!unit) {
        const error = new Error('Unit not found'); error.status = 404; throw error;
      }
      if (unit.currentStock < quantity && !(ownerOverride === true && req.user.role === 'owner')) {
        const error = new Error('Insufficient stock available'); error.status = 400; error.code = 'INSUFFICIENT_STOCK'; throw error;
      }

      const customer = await Customer.findById(customerId).session(session);
      if (!customer) {
        const error = new Error('Customer not found'); error.status = 404; throw error;
      }
      if (customer.type === 'retail' && paymentType !== 'cash') {
        const error = new Error('Retail customers can only make cash payments'); error.status = 400; throw error;
      }

      const finalAmountPaid = paymentType === 'cash' ? amount : paymentType === 'partial' ? amountPaid : 0;
      const dueAmount = paymentType === 'credit' ? amount : paymentType === 'partial'
        ? Math.round((amount - finalAmountPaid) * 100) / 100 : 0;
      if (finalAmountPaid < 0 || dueAmount < 0 || (paymentType === 'partial' && finalAmountPaid <= 0)) {
        const error = new Error('Invalid payment amount'); error.status = 400; throw error;
      }

      if (dueAmount > 0) await ledgerService.addToBalance(customerId, dueAmount, session);
      await stockService.removeStock(unitId, quantity, ownerOverride === true && req.user.role === 'owner', session);

      const createdSale = new SaleEntry({
        date: date ? new Date(date) : Date.now(), customerId, unitId, quantity, rate, amount,
        paymentType, amountPaid: finalAmountPaid, dueAmount, costAtSale: unit.avgCost || 0,
      });
      await createdSale.save(session ? { session } : undefined);
      await auditService.log(
        req.user, 'CREATE', 'Sale', createdSale._id,
        `Sale: ${quantity}L @ ₹${rate} = ₹${amount} (${paymentType})`,
        { customerId, unitId, quantity, rate, amount, paymentType }, session
      );
      return {
        sale: createdSale,
        warningResponse: customer.type === 'credit' && customer.creditLimit && customer.currentBalance + dueAmount > customer.creditLimit
          ? { creditLimitWarning: true, message: 'This sale exceeds credit limit' } : null,
      };
    });

    res.status(201).json({
      success: true,
      data: sale,
      ...(warningResponse && warningResponse)
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
    if (error.status === 400) return res.status(400).json({ success: false, ...(error.code && { code: error.code }), message: error.message });
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
  try {
    const { voidReason } = req.body;
    if (!voidReason) {
      return res.status(400).json({ success: false, message: 'Void reason is required' });
    }

    const sale = await runAtomic(async (session) => {
      const saleToVoid = await SaleEntry.findById(req.params.id).session(session);
      if (!saleToVoid) { const error = new Error('Sale not found'); error.status = 404; throw error; }
      if (saleToVoid.status === 'voided') { const error = new Error('Sale is already voided'); error.status = 400; throw error; }

      await stockService.reverseStockRemoval(saleToVoid.unitId, saleToVoid.quantity, session);
      if (saleToVoid.dueAmount > 0) await ledgerService.reverseBalance(saleToVoid.customerId, saleToVoid.dueAmount, session);
      saleToVoid.status = 'voided'; saleToVoid.voidedAt = new Date(); saleToVoid.voidedBy = req.user._id; saleToVoid.voidReason = voidReason;
      await saleToVoid.save(session ? { session } : undefined);
      await auditService.log(req.user, 'VOID', 'Sale', saleToVoid._id,
        `Voided sale ₹${saleToVoid.amount} — Reason: ${voidReason}`,
        { voidReason, quantity: saleToVoid.quantity, amount: saleToVoid.amount }, session);
      return saleToVoid;
    });

    res.json({ success: true, data: sale });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
    if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
    next(error);
  }
};
