const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.route('/')
  .get(auth, role('owner', 'operator'), customersController.getCustomers)
  .post(auth, role('owner'), customersController.createCustomer);

router.route('/:id')
  .get(auth, role('owner', 'operator'), customersController.getCustomer)
  .put(auth, role('owner'), customersController.updateCustomer)
  .delete(auth, role('owner'), customersController.deleteCustomer);

module.exports = router;
