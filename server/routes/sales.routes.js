const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/', auth, role('owner', 'operator'), salesController.getSales);
router.post('/', auth, role('owner', 'operator'), salesController.createSale);
router.get('/:id', auth, role('owner', 'operator'), salesController.getSale);
router.post('/:id/void', auth, role('owner'), salesController.voidSale);

module.exports = router;
