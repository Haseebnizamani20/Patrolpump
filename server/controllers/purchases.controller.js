const PurchaseEntry = require('../models/PurchaseEntry');
const Supplier = require('../models/Supplier');
const Unit = require('../models/Unit');
const stockService = require('../services/stockService');
const auditService = require('../services/auditService');
const { runAtomic } = require('../services/transactionService');

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
    
    const purchase = await runAtomic(async (session) => {
      const unit = await Unit.findById(unitId).session(session);
      if (!unit) {
        const error = new Error('Unit not found');
        error.status = 404;
        throw error;
      }

      if (unit.capacity && unit.currentStock + normalizedQuantity > unit.capacity &&
          !(ownerOverride === true && req.user.role === 'owner')) {
        const error = new Error('Adding quantity would exceed unit capacity');
        error.status = 400;
        error.code = 'CAPACITY_EXCEEDED';
        throw error;
      }

      const supplier = await Supplier.findById(supplierId).session(session);
      if (!supplier) {
        const error = new Error('Supplier not found');
        error.status = 404;
        throw error;
      }

      await stockService.addStock(unitId, normalizedQuantity, normalizedRate,
        ownerOverride === true && req.user.role === 'owner', session);

      if (paymentStatus === 'pending') supplier.outstandingPayable += amount;
      if (paymentStatus === 'partial') supplier.outstandingPayable += amount - normalizedAmountPaid;
      await supplier.save(session ? { session } : undefined);

      const createdPurchase = new PurchaseEntry({
        date: date ? new Date(date) : Date.now(), supplierId, unitId, quantity, rate,
        amount, invoiceNo, paymentStatus, amountPaid: normalizedAmountPaid, notes,
      });
      await createdPurchase.save(session ? { session } : undefined);

      await auditService.log(
        req.user, 'CREATE', 'Purchase', createdPurchase._id,
        `Purchase: ${normalizedQuantity}L @ Rs ${normalizedRate} from supplier — Rs ${amount}`,
        { supplierId, unitId, quantity: normalizedQuantity, rate: normalizedRate, amount, paymentStatus }, session
      );
      return createdPurchase;
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    if (error.code === 'CAPACITY_EXCEEDED') {
      return res.status(400).json({ success: false, code: error.code, message: error.message });
    }
    if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
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
