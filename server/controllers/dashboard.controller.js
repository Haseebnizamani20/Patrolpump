const SaleEntry = require('../models/SaleEntry');
const PurchaseEntry = require('../models/PurchaseEntry');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashSession = require('../models/CashSession');
const Customer = require('../models/Customer');
const Unit = require('../models/Unit');

/** Returns the start and end of a calendar day */
const dayBounds = (date) => {
  const d = date ? new Date(date) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
};

/**
 * GET /api/dashboard
 * Returns all dashboard data in a single call.
 * Accessible by owner AND operator (so operators see live numbers).
 */
exports.getDashboardData = async (req, res, next) => {
  try {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = dayBounds(now);

    // ---- Yesterday bounds ----
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const { start: yStart, end: yEnd } = dayBounds(yesterday);

    // ---- Today's sales ----
    const todaySales = await SaleEntry.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd }, status: 'active' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalLiters: { $sum: '$quantity' },
          cashSales: { $sum: { $cond: [{ $eq: ['$paymentType', 'cash'] }, '$amount', 0] } },
          creditSales: { $sum: { $cond: [{ $eq: ['$paymentType', 'credit'] }, '$amount', 0] } },
          grossProfit: { $sum: { $subtract: ['$amount', { $multiply: ['$costAtSale', '$quantity'] }] } },
        },
      },
    ]);
    const salesSummary = todaySales[0] || {
      count: 0, totalAmount: 0, totalLiters: 0,
      cashSales: 0, creditSales: 0, grossProfit: 0,
    };

    // ---- Today's purchases ----
    const todayPurchases = await PurchaseEntry.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' }, totalLiters: { $sum: '$quantity' } } },
    ]);
    const purchaseSummary = todayPurchases[0] || { count: 0, totalAmount: 0, totalLiters: 0 };

    // ---- Today's expenses ----
    const todayExpenses = await Expense.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const expenseTotal = todayExpenses[0]?.total || 0;

    // ---- Today's payments received ----
    const todayPayments = await Payment.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const paymentTotal = todayPayments[0]?.total || 0;

    // ---- Today's cash session ----
    const todaySession = await CashSession.findOne({
      date: { $gte: todayStart, $lte: todayEnd },
    }).populate('openedBy', 'name');

    // ---- Yesterday's cash session (for variance flag) ----
    const yesterdaySession = await CashSession.findOne({
      date: { $gte: yStart, $lte: yEnd },
      status: 'closed',
    }).select('shortageOrExcess closingCash expectedCash date');

    // ---- Stock levels per unit ----
    const units = await Unit.find().sort({ name: 1 });
    const stockLevels = units.map((u) => {
      const utilizationPct = u.capacity > 0
        ? Math.round((u.currentStock / u.capacity) * 10000) / 100
        : 0;
      const isLowStock = u.status === 'active' && u.capacity > 0 && utilizationPct < 20;
      return {
        _id: u._id,
        name: u.name,
        fuelType: u.fuelType,
        capacity: u.capacity,
        currentStock: Math.round(u.currentStock * 100) / 100,
        avgCost: Math.round(u.avgCost * 100) / 100,
        utilizationPct,
        stockValue: Math.round(u.currentStock * u.avgCost * 100) / 100,
        status: u.status,
        isLowStock,
      };
    });

    const lowStockAlerts = stockLevels.filter(u => u.isLowStock);
    const totalStockValue = Math.round(stockLevels.reduce((s, u) => s + u.stockValue, 0) * 100) / 100;

    // ---- Top 5 customer dues ----
    const topDues = await Customer.find({ type: 'credit', currentBalance: { $gt: 0 } })
      .sort({ currentBalance: -1 })
      .limit(5)
      .select('name phone currentBalance creditLimit');

    const totalDues = await Customer.aggregate([
      { $match: { type: 'credit', currentBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$currentBalance' }, count: { $sum: 1 } } },
    ]);
    const duesSummary = totalDues[0] || { total: 0, count: 0 };

    // ---- Net cash position today ----
    const openingCash = todaySession?.openingCash || 0;
    const netCash = Math.round(
      (openingCash + salesSummary.cashSales + paymentTotal - expenseTotal) * 100
    ) / 100;

    // Round all money values
    const r = (v) => Math.round((v || 0) * 100) / 100;

    res.json({
      success: true,
      data: {
        // Today overview
        today: {
          date: now.toISOString().slice(0, 10),
          sales: {
            count: salesSummary.count,
            totalAmount: r(salesSummary.totalAmount),
            totalLiters: r(salesSummary.totalLiters),
            cashSales: r(salesSummary.cashSales),
            creditSales: r(salesSummary.creditSales),
            grossProfit: r(salesSummary.grossProfit),
          },
          purchases: {
            count: purchaseSummary.count,
            totalAmount: r(purchaseSummary.totalAmount),
            totalLiters: r(purchaseSummary.totalLiters),
          },
          expenses: r(expenseTotal),
          paymentsReceived: r(paymentTotal),
          netCash: r(netCash),
        },
        // Cash session
        cashSession: todaySession
          ? {
              _id: todaySession._id,
              status: todaySession.status,
              openingCash: r(todaySession.openingCash),
              openedBy: todaySession.openedBy?.name,
            }
          : null,
        // Yesterday's variance
        yesterdayVariance: yesterdaySession
          ? {
              date: yesterdaySession.date,
              shortageOrExcess: r(yesterdaySession.shortageOrExcess),
              closingCash: r(yesterdaySession.closingCash),
              expectedCash: r(yesterdaySession.expectedCash),
            }
          : null,
        // Stock
        stock: {
          units: stockLevels,
          lowStockAlerts,
          totalStockValue,
        },
        // Customer dues
        customerDues: {
          top5: topDues,
          totalDues: r(duesSummary.total),
          customersWithDues: duesSummary.count,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
