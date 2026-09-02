const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setup.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.get('/status', auth, setupController.getSetupStatus);
router.post('/opening-balances', auth, role('owner'), setupController.saveOpeningBalances);

module.exports = router;
