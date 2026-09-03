const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  getDailyReport,
  getCustomerLedger,
  getStockReport,
  getProfitReport,
  getCustomerDues,
  getSupplierDues,
  getExpenseReport,
} = require('../controllers/reports.controller');

// All reports are owner-only (FR-9)
router.get('/daily',                   auth, role('owner'), getDailyReport);
router.get('/ledger/:customerId',      auth, role('owner'), getCustomerLedger);
router.get('/stock',                   auth, role('owner'), getStockReport);
router.get('/profit',                  auth, role('owner'), getProfitReport);
router.get('/customer-dues',           auth, role('owner'), getCustomerDues);
router.get('/supplier-dues',           auth, role('owner'), getSupplierDues);
router.get('/expenses',                auth, role('owner'), getExpenseReport);

module.exports = router;
