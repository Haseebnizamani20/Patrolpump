const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/adjustments', auth, role('owner', 'operator'), stockController.getStockAdjustments);
router.post('/adjustment', auth, role('owner'), stockController.createStockAdjustment);

module.exports = router;
