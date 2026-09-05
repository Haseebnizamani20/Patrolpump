const Customer = require('../models/Customer');

exports.addToBalance = async (customerId, amount, session = null) => {
  const customer = await Customer.findById(customerId).session(session);
  if (!customer) throw new Error('Customer not found');

  customer.currentBalance += amount;
  return await customer.save(session ? { session } : undefined);
};

exports.reduceBalance = async (customerId, amount, session = null) => {
  const customer = await Customer.findById(customerId).session(session);
  if (!customer) throw new Error('Customer not found');

  customer.currentBalance -= amount;
  return await customer.save(session ? { session } : undefined);
};

exports.reverseBalance = async (customerId, amount, session = null) => {
  const customer = await Customer.findById(customerId).session(session);
  if (!customer) throw new Error('Customer not found');

  customer.currentBalance -= amount;
  return await customer.save(session ? { session } : undefined);
};
