const User = require('../models/User');
const Customer = require('../models/Customer');

/**
 * Seed the default Owner account on first run.
 * Only creates the account if no users exist in the database.
 *
 * Default credentials:
 *   username: owner
 *   password: owner123
 */
const seedDefaultOwner = async () => {
  try {
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      await User.create({
        username: 'owner',
        password: 'owner123',
        name: 'Pump Owner',
        role: 'owner',
      });
      console.log('✔ Default owner account created (username: owner / password: owner123)');
      console.log('  ⚠ Change this password after first login!');
    }
  } catch (error) {
    console.error('Error seeding default owner:', error.message);
  }
};

const seedWalkInCustomer = async () => {
  try {
    const walkInExists = await Customer.findOne({ name: 'Walk-in', type: 'retail' });
    if (!walkInExists) {
      await Customer.create({
        name: 'Walk-in',
        type: 'retail',
        isActive: true,
      });
      console.log('✔ Walk-in customer created');
    }
  } catch (error) {
    console.error('Error seeding walk-in customer:', error.message);
  }
};

const runSeeds = async () => {
  await seedDefaultOwner();
  await seedWalkInCustomer();
};

module.exports = runSeeds;
