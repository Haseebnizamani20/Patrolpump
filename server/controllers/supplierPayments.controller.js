const SupplierPayment = require('../models/SupplierPayment');
const Supplier = require('../models/Supplier');
const auditService = require('../services/auditService');
const { runAtomic } = require('../services/transactionService');

/**
 * GET /api/supplier-payments
 * List all supplier payments, filterable by supplierId and date range.
 */
exports.getSupplierPayments = async (req, res, next) => {
  try {
    const { supplierId, startDate, endDate } = req.query;
    const query = {};

    if (supplierId) query.supplierId = supplierId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const payments = await SupplierPayment.find(query)
      .populate('supplierId', 'name phone')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/supplier-payments/:id
 */
exports.getSupplierPayment = async (req, res, next) => {
  try {
    const payment = await SupplierPayment.findById(req.params.id)
      .populate('supplierId', 'name phone outstandingPayable')
      .populate('recordedBy', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Supplier payment not found' });
    }
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/supplier-payments
 * Record a payment to a supplier and reduce their outstandingPayable.
 */
exports.createSupplierPayment = async (req, res, next) => {
  try {
    const { supplierId, amount, mode, referenceNo, notes, date, ownerOverride } = req.body;

    if (!supplierId || amount == null || !mode) {
      return res.status(400).json({
        success: false,
        message: 'Supplier, amount, and mode are required',
      });
    }

    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const { payment, updatedPayable } = await runAtomic(async (session) => {
      const supplier = await Supplier.findById(supplierId).session(session);
      if (!supplier) { const error = new Error('Supplier not found'); error.status = 404; throw error; }
      if (!supplier.isActive) { const error = new Error('Supplier is inactive'); error.status = 400; throw error; }

      const resultingPayable = Math.round((supplier.outstandingPayable - parsedAmount) * 100) / 100;
      if (resultingPayable < 0 && !(ownerOverride === true && req.user.role === 'owner')) {
        const error = new Error(`Payment of Rs ${parsedAmount} exceeds outstanding payable of Rs ${supplier.outstandingPayable.toFixed(2)}`);
        error.status = 400; error.code = 'OVERPAYMENT'; error.outstandingPayable = supplier.outstandingPayable; throw error;
      }
      supplier.outstandingPayable = Math.max(0, resultingPayable);
      await supplier.save(session ? { session } : undefined);
      const createdPayment = new SupplierPayment({ date: date ? new Date(date) : new Date(), supplierId, amount: parsedAmount, mode, referenceNo, notes, recordedBy: req.user._id });
      await createdPayment.save(session ? { session } : undefined);
      await auditService.log(req.user, 'CREATE', 'SupplierPayment', createdPayment._id,
        `Paid Rs ${parsedAmount} to ${supplier.name} via ${mode}`,
        { supplierId, amount: parsedAmount, mode, newPayable: supplier.outstandingPayable }, session);
      return { payment: createdPayment, updatedPayable: supplier.outstandingPayable };
    });
    res.status(201).json({
      success: true,
      data: payment,
      updatedPayable,
    });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ success: false, message: error.message });
    if (error.status === 400) return res.status(400).json({ success: false, ...(error.code && { code: error.code }), ...(error.outstandingPayable !== undefined && { outstandingPayable: error.outstandingPayable }), message: error.message });
    next(error);
  }
};
