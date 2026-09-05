const SaleEntry = require('../models/SaleEntry');
const PurchaseEntry = require('../models/PurchaseEntry');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashSession = require('../models/CashSession');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Unit = require('../models/Unit');
const SupplierPayment = require('../models/SupplierPayment');

/** Get start/end of a calendar day */
const dayBounds = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ================================================================
// GET /api/reports/daily?date=YYYY-MM-DD
// Daily summary: sales, purchases, payments, expenses, profit, session
// ================================================================
exports.getDailyReport = async (req, res, next) => {
  try {
    const { start, end } = dayBounds(req.query.date);

    // --- Sales ---
    const sales = await SaleEntry.find({ date: { $gte: start, $lte: end }, status: 'active' })
      .populate('customerId', 'name')
      .populate('unitId', 'name');

    const totalSalesAmount  = sales.reduce((s, x) => s + x.amount, 0);
    const totalCashSales    = sales.reduce((s, x) => s + x.amountPaid, 0);
    const totalCreditSales  = sales.reduce((s, x) => s + x.dueAmount, 0);
    const totalLitersSold   = sales.reduce((s, x) => s + x.quantity, 0);
    const grossProfit       = sales.reduce((s, x) => s + (x.rate - (x.costAtSale || 0)) * x.quantity, 0);

    const voidedSales = await SaleEntry.countDocuments({ date: { $gte: start, $lte: end }, status: 'voided' });

    // --- Purchases ---
    const purchases = await PurchaseEntry.find({ date: { $gte: start, $lte: end } })
      .populate('supplierId', 'name')
      .populate('unitId', 'name');
    const totalPurchaseAmount = purchases.reduce((s, x) => s + x.amount, 0);
    const totalLitersPurchased = purchases.reduce((s, x) => s + x.quantity, 0);

    // --- Payments received ---
    const payments = await Payment.find({ date: { $gte: start, $lte: end } })
      .populate('customerId', 'name');
    const totalPaymentsReceived = payments.reduce((s, x) => s + x.amount, 0);
    const totalCashPayments     = payments.filter(p => p.mode === 'cash').reduce((s, x) => s + x.amount, 0);

    // --- Expenses ---
    const expenses = await Expense.find({ date: { $gte: start, $lte: end } });
    const totalExpenses     = expenses.reduce((s, x) => s + x.amount, 0);
    const totalCashExpenses = expenses.filter(e => e.mode === 'cash').reduce((s, x) => s + x.amount, 0);
    const totalBankExpenses = expenses.filter(e => e.mode === 'bank').reduce((s, x) => s + x.amount, 0);

    const supplierPayments = await SupplierPayment.find({ date: { $gte: start, $lte: end } })
      .populate('supplierId', 'name');
    const totalSupplierPayments = supplierPayments.reduce((s, x) => s + x.amount, 0);
    const totalCashPaidToSuppliers = supplierPayments
      .filter(p => p.mode === 'cash')
      .reduce((s, x) => s + x.amount, 0);

    // --- Cash Session ---
    const session = await CashSession.findOne({ date: { $gte: start, $lte: end } })
      .populate('openedBy', 'name').populate('closedBy', 'name');

    res.json({
      success: true,
      data: {
        date: start,
        sales: {
          count: sales.length,
          voidedCount: voidedSales,
          totalAmount: Math.round(totalSalesAmount * 100) / 100,
          cashSales: Math.round(totalCashSales * 100) / 100,
          creditSales: Math.round(totalCreditSales * 100) / 100,
          totalLiters: Math.round(totalLitersSold * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          items: sales,
        },
        purchases: {
          count: purchases.length,
          totalAmount: Math.round(totalPurchaseAmount * 100) / 100,
          totalLiters: Math.round(totalLitersPurchased * 100) / 100,
          items: purchases,
        },
        payments: {
          count: payments.length,
          totalReceived: Math.round(totalPaymentsReceived * 100) / 100,
          cashPayments: Math.round(totalCashPayments * 100) / 100,
          items: payments,
        },
        expenses: {
          count: expenses.length,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          cashExpenses: Math.round(totalCashExpenses * 100) / 100,
          bankExpenses: Math.round(totalBankExpenses * 100) / 100,
          items: expenses,
        },
        supplierPayments: {
          count: supplierPayments.length,
          totalPaid: Math.round(totalSupplierPayments * 100) / 100,
          cashPaid: Math.round(totalCashPaidToSuppliers * 100) / 100,
          items: supplierPayments,
        },
        cashSession: session || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/reports/ledger/:customerId?startDate=&endDate=
// Customer ledger: all transactions with running balance
// ================================================================
exports.getCustomerLedger = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    const hasDateFilter = startDate || endDate;

    // Sales for this customer (credit/partial — these create a due)
    const sales = await SaleEntry.find({
      customerId,
      status: 'active',
      dueAmount: { $gt: 0 },
      ...(hasDateFilter && { date: dateFilter }),
    }).populate('unitId', 'name').sort({ date: 1 });

    // Payments from this customer
    const payments = await Payment.find({
      customerId,
      ...(hasDateFilter && { date: dateFilter }),
    }).sort({ date: 1 });

    // Combine into a timeline
    const transactions = [
      ...sales.map(s => ({
        type: 'sale',
        date: s.date,
        description: `Sale — ${s.unitId?.name || 'Unit'} ${s.quantity}L @ ₹${s.rate}`,
        debit: s.dueAmount,  // amount added to balance (customer owes more)
        credit: 0,
        ref: s._id,
      })),
      ...payments.map(p => ({
        type: 'payment',
        date: p.date,
        description: `Payment — ${p.mode}${p.notes ? ': ' + p.notes : ''}`,
        debit: 0,
        credit: p.amount,    // amount reduced from balance (customer paid)
        ref: p._id,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute running balance (start from openingBalance if no date filter, else from 0)
    let runningBalance = hasDateFilter ? 0 : customer.openingBalance;
    const ledger = transactions.map(t => {
      runningBalance = Math.round((runningBalance + t.debit - t.credit) * 100) / 100;
      return { ...t, balance: runningBalance };
    });

    res.json({
      success: true,
      data: {
        customer,
        openingBalance: customer.openingBalance,
        currentBalance: customer.currentBalance,
        transactions: ledger,
        summary: {
          totalDebit:  Math.round(ledger.reduce((s, t) => s + t.debit, 0) * 100) / 100,
          totalCredit: Math.round(ledger.reduce((s, t) => s + t.credit, 0) * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/reports/stock
// Current stock snapshot for all units
// ================================================================
exports.getStockReport = async (req, res, next) => {
  try {
    const units = await Unit.find().sort({ name: 1 });

    const rows = units.map(u => ({
      _id: u._id,
      name: u.name,
      status: u.status,
      capacity: u.capacity,
      currentStock: u.currentStock,
      avgCost: u.avgCost,
      stockValue: Math.round(u.currentStock * u.avgCost * 100) / 100,
      utilizationPct: u.capacity > 0
        ? Math.round((u.currentStock / u.capacity) * 10000) / 100
        : null,
    }));

    const totalStockValue = Math.round(rows.reduce((s, r) => s + r.stockValue, 0) * 100) / 100;
    const totalLiters = Math.round(rows.reduce((s, r) => s + r.currentStock, 0) * 100) / 100;

    res.json({
      success: true,
      data: {
        units: rows,
        summary: { totalLiters, totalStockValue },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/reports/profit?startDate=&endDate=&groupBy=day|unit
// Profit report: (rate - costAtSale) × quantity per active sale
// ================================================================
exports.getProfitReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage = { status: 'active' };
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        matchStage.date.$lte = end;
      }
    }

    // Aggregate profit per sale, then group
    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          revenue: { $multiply: ['$rate', '$quantity'] },
          cost:    { $multiply: ['$costAtSale', '$quantity'] },
          profit:  { $multiply: [{ $subtract: ['$rate', '$costAtSale'] }, '$quantity'] },
        },
      },
    ];

    if (groupBy === 'unit') {
      pipeline.push(
        {
          $group: {
            _id: '$unitId',
            totalRevenue:  { $sum: '$revenue' },
            totalCost:     { $sum: '$cost' },
            totalProfit:   { $sum: '$profit' },
            totalQuantity: { $sum: '$quantity' },
            saleCount:     { $sum: 1 },
          },
        },
        { $sort: { totalProfit: -1 } }
      );

      const rows = await SaleEntry.aggregate(pipeline);
      await SaleEntry.populate(rows, { path: '_id', model: 'Unit', select: 'name' });

      const totals = rows.reduce((acc, r) => ({
        totalRevenue:  acc.totalRevenue  + r.totalRevenue,
        totalCost:     acc.totalCost     + r.totalCost,
        totalProfit:   acc.totalProfit   + r.totalProfit,
        totalQuantity: acc.totalQuantity + r.totalQuantity,
      }), { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalQuantity: 0 });

      return res.json({
        success: true,
        data: {
          groupBy: 'unit',
          rows: rows.map(r => ({
            unit: r._id,
            totalRevenue:  Math.round(r.totalRevenue  * 100) / 100,
            totalCost:     Math.round(r.totalCost     * 100) / 100,
            totalProfit:   Math.round(r.totalProfit   * 100) / 100,
            totalQuantity: Math.round(r.totalQuantity * 100) / 100,
            saleCount: r.saleCount,
            profitMarginPct: r.totalRevenue > 0
              ? Math.round((r.totalProfit / r.totalRevenue) * 10000) / 100
              : 0,
          })),
          summary: {
            totalRevenue:  Math.round(totals.totalRevenue  * 100) / 100,
            totalCost:     Math.round(totals.totalCost     * 100) / 100,
            totalProfit:   Math.round(totals.totalProfit   * 100) / 100,
            totalQuantity: Math.round(totals.totalQuantity * 100) / 100,
            profitMarginPct: totals.totalRevenue > 0
              ? Math.round((totals.totalProfit / totals.totalRevenue) * 10000) / 100
              : 0,
          },
        },
      });
    }

    // Default: group by day
    pipeline.push(
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalRevenue:  { $sum: '$revenue' },
          totalCost:     { $sum: '$cost' },
          totalProfit:   { $sum: '$profit' },
          totalQuantity: { $sum: '$quantity' },
          saleCount:     { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } }
    );

    const rows = await SaleEntry.aggregate(pipeline);

    const totals = rows.reduce((acc, r) => ({
      totalRevenue:  acc.totalRevenue  + r.totalRevenue,
      totalCost:     acc.totalCost     + r.totalCost,
      totalProfit:   acc.totalProfit   + r.totalProfit,
      totalQuantity: acc.totalQuantity + r.totalQuantity,
    }), { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalQuantity: 0 });

    res.json({
      success: true,
      data: {
        groupBy: 'day',
        rows: rows.map(r => ({
          date: r._id,
          totalRevenue:  Math.round(r.totalRevenue  * 100) / 100,
          totalCost:     Math.round(r.totalCost     * 100) / 100,
          totalProfit:   Math.round(r.totalProfit   * 100) / 100,
          totalQuantity: Math.round(r.totalQuantity * 100) / 100,
          saleCount: r.saleCount,
          profitMarginPct: r.totalRevenue > 0
            ? Math.round((r.totalProfit / r.totalRevenue) * 10000) / 100
            : 0,
        })),
        summary: {
          totalRevenue:  Math.round(totals.totalRevenue  * 100) / 100,
          totalCost:     Math.round(totals.totalCost     * 100) / 100,
          totalProfit:   Math.round(totals.totalProfit   * 100) / 100,
          totalQuantity: Math.round(totals.totalQuantity * 100) / 100,
          profitMarginPct: totals.totalRevenue > 0
            ? Math.round((totals.totalProfit / totals.totalRevenue) * 10000) / 100
            : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/reports/customer-dues?all=true
// Customer dues with ageing: 0-30, 31-60, 61-90, 90+ days.
// ================================================================
exports.getCustomerDues = async (req, res, next) => {
  try {
    const showAll = req.query.all === 'true';
    const query = { type: 'credit' };
    if (!showAll) query.currentBalance = { $gt: 0 };

    const customers = await Customer.find(query).sort({ currentBalance: -1 });
    const now = new Date();

    const rows = await Promise.all(
      customers.map(async (c) => {
        const lastPayment = await Payment.findOne({ customerId: c._id })
          .sort({ date: -1 }).select('date amount');
        const lastSale = await SaleEntry.findOne({
          customerId: c._id, status: 'active', dueAmount: { $gt: 0 },
        }).sort({ date: -1 }).select('date');

        const referenceDate = lastPayment?.date || c.createdAt || now;
        const daysSincePayment = Math.floor(
          (now - new Date(referenceDate)) / (1000 * 60 * 60 * 24)
        );

        let ageing;
        if (daysSincePayment <= 30)      ageing = '0-30 days';
        else if (daysSincePayment <= 60) ageing = '31-60 days';
        else if (daysSincePayment <= 90) ageing = '61-90 days';
        else                             ageing = '90+ days';

        const usagePct = c.creditLimit > 0
          ? Math.round((c.currentBalance / c.creditLimit) * 10000) / 100
          : null;

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          creditLimit: c.creditLimit,
          currentBalance: Math.round(c.currentBalance * 100) / 100,
          availableCredit: Math.round((c.creditLimit - c.currentBalance) * 100) / 100,
          usagePct,
          lastPaymentDate: lastPayment?.date || null,
          lastPaymentAmount: lastPayment?.amount || null,
          lastSaleDate: lastSale?.date || null,
          daysSincePayment,
          ageing,
        };
      })
    );

    const totalDues = Math.round(rows.reduce((s, r) => s + r.currentBalance, 0) * 100) / 100;
    const ageingSummary = {
      '0-30 days':  Math.round(rows.filter(r => r.ageing === '0-30 days').reduce((s, r) => s + r.currentBalance, 0) * 100) / 100,
      '31-60 days': Math.round(rows.filter(r => r.ageing === '31-60 days').reduce((s, r) => s + r.currentBalance, 0) * 100) / 100,
      '61-90 days': Math.round(rows.filter(r => r.ageing === '61-90 days').reduce((s, r) => s + r.currentBalance, 0) * 100) / 100,
      '90+ days':   Math.round(rows.filter(r => r.ageing === '90+ days').reduce((s, r) => s + r.currentBalance, 0) * 100) / 100,
    };

    res.json({
      success: true,
      data: { customers: rows, summary: { totalDues, ageingSummary, count: rows.length } },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/reports/supplier-dues?all=true
// Outstanding payable per supplier with last payment info.
// ================================================================
exports.getSupplierDues = async (req, res, next) => {
  try {
    const SupplierPayment = require('../models/SupplierPayment');
    const showAll = req.query.all === 'true';
    const query = {};
    if (!showAll) query.outstandingPayable = { $gt: 0 };

    const suppliers = await Supplier.find(query).sort({ outstandingPayable: -1 });

    const rows = await Promise.all(
      suppliers.map(async (s) => {
        const lastPmt = await SupplierPayment.findOne({ supplierId: s._id })
          .sort({ date: -1 }).select('date amount');
        const lastPurch = await PurchaseEntry.findOne({ supplierId: s._id })
          .sort({ date: -1 }).select('date amount paymentStatus');

        return {
          _id: s._id,
          name: s.name,
          phone: s.phone,
          gstNo: s.gstNo,
          outstandingPayable: Math.round(s.outstandingPayable * 100) / 100,
          lastPaymentDate: lastPmt?.date || null,
          lastPaymentAmount: lastPmt?.amount || null,
          lastPurchaseDate: lastPurch?.date || null,
          lastPurchaseAmount: lastPurch?.amount || null,
          lastPurchaseStatus: lastPurch?.paymentStatus || null,
        };
      })
    );

    const totalPayable = Math.round(rows.reduce((s, r) => s + r.outstandingPayable, 0) * 100) / 100;

    res.json({
      success: true,
      data: { suppliers: rows, summary: { totalPayable, count: rows.length } },
    });
  } catch (error) {
    next(error);
  }
};

// ================================================================
// GET /api/reports/expenses?startDate=&endDate=&groupBy=category|day|mode
// Expense summary grouped by category (default), day, or mode.
// ================================================================
exports.getExpenseReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'category' } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        matchStage.date.$lte = end;
      }
    }

    let groupField;
    if (groupBy === 'day')       groupField = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    else if (groupBy === 'mode') groupField = '$mode';
    else                         groupField = '$category';

    const rows = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupField,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          cashAmount: { $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$amount', 0] } },
          bankAmount: { $sum: { $cond: [{ $eq: ['$mode', 'bank'] }, '$amount', 0] } },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const items = await Expense.find(matchStage).sort({ date: -1 });
    const grandTotal = Math.round(rows.reduce((s, r) => s + r.totalAmount, 0) * 100) / 100;
    const totalCash  = Math.round(rows.reduce((s, r) => s + r.cashAmount,  0) * 100) / 100;
    const totalBank  = Math.round(rows.reduce((s, r) => s + r.bankAmount,  0) * 100) / 100;

    res.json({
      success: true,
      data: {
        groupBy,
        rows: rows.map(r => ({
          label: r._id || 'Uncategorised',
          totalAmount: Math.round(r.totalAmount * 100) / 100,
          cashAmount:  Math.round(r.cashAmount  * 100) / 100,
          bankAmount:  Math.round(r.bankAmount  * 100) / 100,
          count: r.count,
        })),
        items,
        summary: { grandTotal, totalCash, totalBank, itemCount: items.length },
      },
    });
  } catch (error) {
    next(error);
  }
};
