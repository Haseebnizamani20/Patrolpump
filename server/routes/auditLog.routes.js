const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getAuditLog } = require('../controllers/auditLog.controller');

// Audit log is owner-only
router.get('/', auth, role('owner'), getAuditLog);

module.exports = router;
