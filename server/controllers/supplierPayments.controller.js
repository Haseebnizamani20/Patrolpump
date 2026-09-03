const SupplierPayment = require('../models/SupplierPayment');
const Supplier = require('../models/Supplier');
const auditService = require('../services/auditService');

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
  let payableReduced = false;
  let savedPayment = null;

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

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    if (!supplier.isActive) {
      return res.status(400).json({ success: false, message: 'Supplier is inactive' });
    }

    // Warn (but allow with owner override) if payment exceeds outstanding
    const resultingPayable = Math.round((supplier.outstandingPayable - parsedAmount) * 100) / 100;
    if (resultingPayable < 0) {
      if (!(ownerOverride === true && req.user.role === 'owner')) {
        return res.status(400).json({
          success: false,
          code: 'OVERPAYMENT',
          message: `Payment of ₹${parsedAmount} exceeds outstanding payable of ₹${supplier.outstandingPayable.toFixed(2)}`,
          outstandingPayable: supplier.outstandingPayable,
        });
      }
    }

    // Reduce outstanding payable
    supplier.outstandingPayable = Math.max(0, resultingPayable);
    await supplier.save();
    payableReduced = true;

    // Save the payment record
    const payment = await SupplierPayment.create({
      date: date ? new Date(date) : new Date(),
      supplierId,
      amount: parsedAmount,
      mode,
      referenceNo,
      notes,
      recordedBy: req.user._id,
    });
    savedPayment = payment;

    // Audit log
    await auditService.log(
      req.user, 'CREATE', 'SupplierPayment', payment._id,
      `Paid ₹${parsedAmount} to ${supplier.name} via ${mode}`,
      { supplierId, amount: parsedAmount, mode, newPayable: supplier.outstandingPayable }
    );

    const updatedSupplier = await Supplier.findById(supplierId);
    res.status(201).json({
      success: true,
      data: payment,
      updatedPayable: updatedSupplier.outstandingPayable,
    });
  } catch (error) {
    // Rollback payable if payment doc failed to save
    if (payableReduced && !savedPayment) {
      try {
        const supplier = await Supplier.findById(req.body.supplierId);
        if (supplier) {
          supplier.outstandingPayable = Math.round(
            (supplier.outstandingPayable + Math.round(Number(req.body.amount) * 100) / 100) * 100
          ) / 100;
          await supplier.save();
        }
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr.message);
      }
    }
    next(error);
  }
};
