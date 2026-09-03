const CashSession = require('../models/CashSession');

/**
 * Middleware: checkDayClosed
 *
 * Enforces BR-4: Closed days are immutable.
 * Apply to any POST route that creates an entry with a date
 * (sales, purchases, payments, expenses, stock adjustments).
 *
 * Checks whether the date in req.body belongs to a closed session.
 * If closed → 403 DAY_CLOSED.
 * If no session exists for that date → allow (entry creates its own open day implicitly).
 */
const checkDayClosed = async (req, res, next) => {
  try {
    const entryDate = req.body.date ? new Date(req.body.date) : new Date();

    // Normalize to midnight of that calendar day
    const dayStart = new Date(entryDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(entryDate);
    dayEnd.setHours(23, 59, 59, 999);

    const session = await CashSession.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
      status: 'closed',
    });

    if (session) {
      return res.status(403).json({
        success: false,
        code: 'DAY_CLOSED',
        message: `The day ${dayStart.toDateString()} is closed. Ask the Owner to reopen it before adding entries.`,
        sessionId: session._id,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkDayClosed;
