const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliers.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.route('/')
  .get(auth, role('owner', 'operator'), suppliersController.getSuppliers)
  .post(auth, role('owner'), suppliersController.createSupplier);

router.route('/:id')
  .get(auth, role('owner', 'operator'), suppliersController.getSupplier)
  .put(auth, role('owner'), suppliersController.updateSupplier)
  .delete(auth, role('owner'), suppliersController.deleteSupplier);

module.exports = router;
