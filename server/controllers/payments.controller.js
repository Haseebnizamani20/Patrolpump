const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const ledgerService = require('../services/ledgerService');

/**
 * GET /api/payments
 * List all payments, filterable by customerId, date range.
 * Sorted newest first.
 */
exports.getPayments = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate } = req.query;
    const query = {};

    if (customerId) query.customerId = customerId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        // Include the full end day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name phone')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/:id
 * Get a single payment by ID.
 */
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('customerId', 'name phone currentBalance')
      .populate('recordedBy', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments
 * Record a payment from a credit customer and reduce their currentBalance.
 *
 * Business rule (FR-6.3): Prevent payment that would make balance negative
 * beyond a configurable tolerance, unless owner overrides.
 * For simplicity the tolerance is 0 (no overpayment), with Owner override.
 */
exports.createPayment = async (req, res, next) => {
  let balanceReduced = false;
  let savedPayment = null;

  try {
    const { customerId, amount, mode, notes, date, ownerOverride } = req.body;

    // --- Validation ---
    if (!customerId || amount == null || !mode) {
      return res.status(400).json({
        success: false,
        message: 'Customer, amount, and mode are required',
      });
    }

    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.type !== 'credit') {
      return res.status(400).json({
        success: false,
        message: 'Payments can only be recorded against credit customers',
      });
    }

    // FR-6.3: Block overpayment unless owner overrides
    const resultingBalance = Math.round((customer.currentBalance - parsedAmount) * 100) / 100;
    if (resultingBalance < 0) {
      if (!(ownerOverride === true && req.user.role === 'owner')) {
        return res.status(400).json({
          success: false,
          code: 'OVERPAYMENT',
          message: `Payment of ₹${parsedAmount} would exceed the customer's balance of ₹${customer.currentBalance.toFixed(2)}`,
          currentBalance: customer.currentBalance,
        });
      }
    }

    // --- Reduce balance ---
    await ledgerService.reduceBalance(customerId, parsedAmount);
    balanceReduced = true;

    // --- Save payment ---
    const payment = await Payment.create({
      date: date ? new Date(date) : new Date(),
      customerId,
      amount: parsedAmount,
      mode,
      notes,
      recordedBy: req.user._id,
    });
    savedPayment = payment;

    // Return with updated customer balance
    const updatedCustomer = await Customer.findById(customerId);

    res.status(201).json({
      success: true,
      data: payment,
      updatedBalance: updatedCustomer.currentBalance,
    });
  } catch (error) {
    // Rollback: restore balance if payment save failed
    if (balanceReduced && !savedPayment) {
      try {
        await ledgerService.addToBalance(req.body.customerId, Math.round(Number(req.body.amount) * 100) / 100);
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr.message);
      }
    }
    next(error);
  }
};
