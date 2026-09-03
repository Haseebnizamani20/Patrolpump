const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkDayClosed = require('../middleware/checkDayClosed');
const {
  getSupplierPayments,
  getSupplierPayment,
  createSupplierPayment,
} = require('../controllers/supplierPayments.controller');

router.get('/', auth, role('owner', 'operator'), getSupplierPayments);
router.get('/:id', auth, role('owner', 'operator'), getSupplierPayment);
// checkDayClosed enforces BR-4; both roles can record supplier payments
router.post('/', auth, role('owner', 'operator'), checkDayClosed, createSupplierPayment);

module.exports = router;
