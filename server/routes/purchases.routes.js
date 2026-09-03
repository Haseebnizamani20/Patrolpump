const express = require('express');
const router = express.Router();
const purchasesController = require('../controllers/purchases.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkDayClosed = require('../middleware/checkDayClosed');

router.get('/', auth, role('owner', 'operator'), purchasesController.getPurchases);
// checkDayClosed enforces BR-4 — no new entries on closed days
router.post('/', auth, role('owner', 'operator'), checkDayClosed, purchasesController.createPurchase);
router.get('/:id', auth, role('owner', 'operator'), purchasesController.getPurchase);

module.exports = router;
