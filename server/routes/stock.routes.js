const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkDayClosed = require('../middleware/checkDayClosed');

router.get('/adjustments', auth, role('owner', 'operator'), stockController.getStockAdjustments);
// checkDayClosed enforces BR-4; owner-only for stock adjustments
router.post('/adjustment', auth, role('owner'), checkDayClosed, stockController.createStockAdjustment);

module.exports = router;
