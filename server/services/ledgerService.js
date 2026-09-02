const Customer = require('../models/Customer');

exports.addToBalance = async (customerId, amount) => {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new Error('Customer not found');

  customer.currentBalance += amount;
  return await customer.save();
};

exports.reduceBalance = async (customerId, amount) => {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new Error('Customer not found');

  customer.currentBalance -= amount;
  return await customer.save();
};

exports.reverseBalance = async (customerId, amount) => {
  const customer = await Customer.findById(customerId);
  if (!customer) throw new Error('Customer not found');

  customer.currentBalance -= amount;
  return await customer.save();
};
