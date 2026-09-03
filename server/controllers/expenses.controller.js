const Expense = require('../models/Expense');

/**
 * Suggested expense categories (free-form, but these are the defaults).
 * Returned by GET /api/expenses/categories so the UI can show suggestions.
 */
const DEFAULT_CATEGORIES = [
  'Fuel (Staff Vehicle)',
  'Electricity',
  'Maintenance',
  'Salaries',
  'Rent',
  'Stationery',
  'Miscellaneous',
];

/**
 * GET /api/expenses/categories
 * Return the list of distinct categories used + default suggestions.
 */
exports.getCategories = async (req, res, next) => {
  try {
    const usedCategories = await Expense.distinct('category');
    // Merge defaults with used, deduplicate, sort
    const merged = [...new Set([...DEFAULT_CATEGORIES, ...usedCategories])].sort();
    res.json({ success: true, data: merged });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/expenses
 * List all expenses, filterable by category, mode, and date range.
 * Sorted newest first.
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const { category, mode, startDate, endDate } = req.query;
    const query = {};

    if (category) query.category = category;
    if (mode) query.mode = mode;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const expenses = await Expense.find(query)
      .populate('recordedBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/expenses/:id
 * Get a single expense by ID.
 */
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('recordedBy', 'name');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/expenses
 * Record a new expense entry (FR-7.1).
 * Cash-mode expenses automatically feed into the daily cash register (FR-7.2 — used in Phase 6).
 */
exports.createExpense = async (req, res, next) => {
  try {
    const { date, category, amount, mode, notes } = req.body;

    // --- Validation ---
    if (!category || amount == null || !mode) {
      return res.status(400).json({
        success: false,
        message: 'Category, amount, and mode are required',
      });
    }

    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    const expense = await Expense.create({
      date: date ? new Date(date) : new Date(),
      category: category.trim(),
      amount: parsedAmount,
      mode,
      notes,
      recordedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};
