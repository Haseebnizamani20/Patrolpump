const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkDayClosed = require('../middleware/checkDayClosed');

router.get('/', auth, role('owner', 'operator'), salesController.getSales);
// checkDayClosed enforces BR-4 — no new entries on closed days
router.post('/', auth, role('owner', 'operator'), checkDayClosed, salesController.createSale);
router.get('/:id', auth, role('owner', 'operator'), salesController.getSale);
// Void is owner-only; the voided entry's date is checked inside the controller
router.post('/:id/void', auth, role('owner'), salesController.voidSale);

module.exports = router;
