const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkDayClosed = require('../middleware/checkDayClosed');
const { getCategories, getExpenses, getExpense, createExpense } = require('../controllers/expenses.controller');

router.get('/categories', auth, role('owner', 'operator'), getCategories);
router.get('/', auth, role('owner', 'operator'), getExpenses);
router.get('/:id', auth, role('owner', 'operator'), getExpense);
// checkDayClosed enforces BR-4
router.post('/', auth, role('owner', 'operator'), checkDayClosed, createExpense);

module.exports = router;
