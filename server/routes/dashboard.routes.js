const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getDashboardData } = require('../controllers/dashboard.controller');

// Both roles can view dashboard data
router.get('/', auth, role('owner', 'operator'), getDashboardData);

module.exports = router;
