const Customer = require('../models/Customer');

exports.getCustomers = async (req, res, next) => {
  try {
    const { type, active } = req.query;
    const query = {};
    
    if (type) query.type = type;
    
    // Default to active customers only unless active is 'false'
    if (active === 'false') {
      query.isActive = false;
    } else if (active !== 'all') {
      query.isActive = true;
    }
    
    const customers = await Customer.find(query).sort({ name: 1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { type, creditLimit, openingBalance } = req.body;
    
    if (type === 'retail') {
      req.body.creditLimit = 0;
    } else if (type === 'credit') {
      // Check if user is owner to set non-zero creditLimit or openingBalance
      if (req.user.role !== 'owner' && (creditLimit > 0 || openingBalance > 0)) {
        return res.status(403).json({ success: false, message: 'Only owners can set credit limit or opening balance' });
      }
    }
    
    req.body.currentBalance = req.body.openingBalance || 0;

    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, creditLimit, isActive } = req.body;
    
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    
    if (name) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (isActive !== undefined) customer.isActive = isActive;

    if (creditLimit !== undefined) {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only owners can update credit limit' });
      }
      customer.creditLimit = creditLimit;
    }

    await customer.save();
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.name === 'Walk-in' && customer.type === 'retail') {
      return res.status(400).json({ success: false, message: 'Walk-in customer cannot be deactivated' });
    }

    customer.isActive = false;
    await customer.save();

    res.json({ success: true, data: customer, message: 'Customer deactivated successfully' });
  } catch (error) {
    next(error);
  }
};
