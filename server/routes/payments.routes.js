const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkDayClosed = require('../middleware/checkDayClosed');
const { getPayments, getPayment, createPayment } = require('../controllers/payments.controller');

router.get('/', auth, role('owner', 'operator'), getPayments);
router.get('/:id', auth, role('owner', 'operator'), getPayment);
// checkDayClosed enforces BR-4
router.post('/', auth, role('owner', 'operator'), checkDayClosed, createPayment);

module.exports = router;
