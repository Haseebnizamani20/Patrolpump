const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getBackupStatus, triggerBackup } = require('../controllers/backup.controller');

// Owner only — backup is a sensitive operation
router.get('/status', auth, role('owner'), getBackupStatus);
router.post('/run',   auth, role('owner'), triggerBackup);

module.exports = router;
