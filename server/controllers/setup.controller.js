const Settings = require('../models/Settings');
const Unit = require('../models/Unit');
const Customer = require('../models/Customer');

exports.getSetupStatus = async (req, res, next) => {
  try {
    const setupFlag = await Settings.findOne({ key: 'setupComplete' });
    const isComplete = setupFlag ? setupFlag.value : false;
    res.json({ success: true, data: { setupComplete: isComplete } });
  } catch (error) {
    next(error);
  }
};

exports.saveOpeningBalances = async (req, res, next) => {
  try {
    // Check if setup is already complete
    const setupFlag = await Settings.findOne({ key: 'setupComplete' });
    if (setupFlag && setupFlag.value) {
      return res.status(400).json({ success: false, message: 'Setup is already complete' });
    }

    const { units = [], customers = [] } = req.body;

    // Process units
    for (const u of units) {
      const unit = await Unit.findById(u.unitId);
      if (unit) {
        unit.currentStock = u.openingStock || 0;
        unit.avgCost = u.avgCost || 0;
        await unit.save();
      }
    }

    // Process customers
    for (const c of customers) {
      const customer = await Customer.findById(c.customerId);
      if (customer) {
        customer.openingBalance = c.openingBalance || 0;
        customer.currentBalance = customer.openingBalance;
        await customer.save();
      }
    }

    // Mark setup as complete
    await Settings.findOneAndUpdate(
      { key: 'setupComplete' },
      { key: 'setupComplete', value: true },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Opening balances saved and setup marked as complete' });
  } catch (error) {
    next(error);
  }
};
