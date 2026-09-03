const CashSession = require('../models/CashSession');
const SaleEntry = require('../models/SaleEntry');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const auditService = require('../services/auditService');

/**
 * Helper: get the start and end of a calendar day for a given date.
 */
const getDayBounds = (date) => {
  const d = date ? new Date(date) : new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Helper: aggregate all cash transactions for a given day.
 * Returns { totalCashSales, totalCashPaymentsReceived, totalCashExpenses, expectedCash }
 */
const aggregateDayTotals = async (dayStart, dayEnd, openingCash) => {
  // Cash sales = cash portion of all active sales on this day
  const salesAgg = await SaleEntry.aggregate([
    {
      $match: {
        date: { $gte: dayStart, $lte: dayEnd },
        status: 'active',
      },
    },
    {
      $group: {
        _id: null,
        totalCashSales: { $sum: '$amountPaid' },
      },
    },
  ]);
  const totalCashSales = salesAgg[0]?.totalCashSales || 0;

  // Cash payments received from credit customers
  const paymentsAgg = await Payment.aggregate([
    {
      $match: {
        date: { $gte: dayStart, $lte: dayEnd },
        mode: 'cash',
      },
    },
    {
      $group: {
        _id: null,
        totalCashPaymentsReceived: { $sum: '$amount' },
      },
    },
  ]);
  const totalCashPaymentsReceived = paymentsAgg[0]?.totalCashPaymentsReceived || 0;

  // Cash expenses
  const expensesAgg = await Expense.aggregate([
    {
      $match: {
        date: { $gte: dayStart, $lte: dayEnd },
        mode: 'cash',
      },
    },
    {
      $group: {
        _id: null,
        totalCashExpenses: { $sum: '$amount' },
      },
    },
  ]);
  const totalCashExpenses = expensesAgg[0]?.totalCashExpenses || 0;

  const expectedCash =
    Math.round(
      (openingCash + totalCashSales + totalCashPaymentsReceived - totalCashExpenses) * 100
    ) / 100;

  return {
    totalCashSales: Math.round(totalCashSales * 100) / 100,
    totalCashPaymentsReceived: Math.round(totalCashPaymentsReceived * 100) / 100,
    totalCashExpenses: Math.round(totalCashExpenses * 100) / 100,
    expectedCash,
  };
};

// ============================================================
// GET /api/cash-sessions
// List all sessions sorted by date descending (owner only).
// ============================================================
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await CashSession.find()
      .populate('openedBy', 'name')
      .populate('closedBy', 'name')
      .populate('reopenedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/cash-sessions/today
// Get today's session (or null if none started).
// ============================================================
exports.getTodaySession = async (req, res, next) => {
  try {
    const { start, end } = getDayBounds();
    const session = await CashSession.findOne({ date: { $gte: start, $lte: end } })
      .populate('openedBy', 'name')
      .populate('closedBy', 'name')
      .populate('reopenedBy', 'name');

    res.json({ success: true, data: session || null });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/cash-sessions/:id/summary
// Fetch live cash summary for an open session.
// Aggregates today's transactions so the operator can see
// what they expect before counting the actual cash.
// ============================================================
exports.getSessionSummary = async (req, res, next) => {
  try {
    const session = await CashSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const { start, end } = getDayBounds(session.date);
    const totals = await aggregateDayTotals(start, end, session.openingCash);

    res.json({
      success: true,
      data: {
        session,
        summary: totals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/cash-sessions/open
// Open a new cash session for today.
// Only one session allowed per day.
// ============================================================
exports.openSession = async (req, res, next) => {
  try {
    const { openingCash = 0, date } = req.body;
    const { start } = getDayBounds(date);

    // Check if a session already exists for this day
    const existing = await CashSession.findOne({
      date: { $gte: start, $lte: new Date(start.getTime() + 86399999) },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A cash session already exists for this day',
        data: existing,
      });
    }

    const parsedOpening = Math.round(Number(openingCash) * 100) / 100;
    if (!Number.isFinite(parsedOpening) || parsedOpening < 0) {
      return res.status(400).json({
        success: false,
        message: 'Opening cash must be a non-negative number',
      });
    }

    const session = await CashSession.create({
      date: start,
      openingCash: parsedOpening,
      status: 'open',
      openedBy: req.user._id,
    });

    await session.populate('openedBy', 'name');

    await auditService.log(
      req.user, 'OPEN_DAY', 'CashSession', session._id,
      `Opened cash session with ₹${parsedOpening} opening cash`,
      { date: start, openingCash: parsedOpening }
    );

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/cash-sessions/:id/close
// Close a session.
// Aggregates all transactions for the day, stores totals.
// closingCash = actual cash counted by operator.
// ============================================================
exports.closeSession = async (req, res, next) => {
  try {
    const { closingCash, notes } = req.body;

    if (closingCash == null) {
      return res.status(400).json({
        success: false,
        message: 'Closing cash amount is required',
      });
    }

    const parsedClosing = Math.round(Number(closingCash) * 100) / 100;
    if (!Number.isFinite(parsedClosing) || parsedClosing < 0) {
      return res.status(400).json({
        success: false,
        message: 'Closing cash must be a non-negative number',
      });
    }

    const session = await CashSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Session is already closed' });
    }

    // Aggregate transactions for the session date
    const { start, end } = getDayBounds(session.date);
    const totals = await aggregateDayTotals(start, end, session.openingCash);

    const shortageOrExcess = Math.round((parsedClosing - totals.expectedCash) * 100) / 100;

    session.status = 'closed';
    session.totalCashSales = totals.totalCashSales;
    session.totalCashPaymentsReceived = totals.totalCashPaymentsReceived;
    session.totalCashExpenses = totals.totalCashExpenses;
    session.expectedCash = totals.expectedCash;
    session.closingCash = parsedClosing;
    session.shortageOrExcess = shortageOrExcess;
    session.notes = notes || '';
    session.closedBy = req.user._id;
    session.closedAt = new Date();

    await session.save();
    await session.populate(['openedBy', 'closedBy']);

    await auditService.log(
      req.user, 'CLOSE_DAY', 'CashSession', session._id,
      `Closed day — expected ₹${totals.expectedCash}, actual ₹${parsedClosing}, diff ₹${shortageOrExcess}`,
      { expectedCash: totals.expectedCash, closingCash: parsedClosing, shortageOrExcess }
    );

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/cash-sessions/:id/reopen
// Owner only: reopen a closed session.
// Clears closure fields so new entries can be added.
// ============================================================
exports.reopenSession = async (req, res, next) => {
  try {
    const session = await CashSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.status === 'open') {
      return res.status(400).json({ success: false, message: 'Session is already open' });
    }

    session.status = 'open';
    session.reopenedBy = req.user._id;
    session.reopenedAt = new Date();
    // Clear close-time fields so they get recalculated on next close
    session.closedBy = undefined;
    session.closedAt = undefined;

    await session.save();
    await session.populate(['openedBy', 'reopenedBy']);

    await auditService.log(
      req.user, 'REOPEN_DAY', 'CashSession', session._id,
      `Reopened closed cash session`,
      { date: session.date }
    );

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};
