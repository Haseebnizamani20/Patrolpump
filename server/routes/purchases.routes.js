const express = require('express');
const router = express.Router();
const purchasesController = require('../controllers/purchases.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/', auth, role('owner', 'operator'), purchasesController.getPurchases);
router.post('/', auth, role('owner', 'operator'), purchasesController.createPurchase);
router.get('/:id', auth, role('owner', 'operator'), purchasesController.getPurchase);

module.exports = router;
