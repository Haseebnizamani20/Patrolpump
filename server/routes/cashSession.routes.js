const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  getSessions,
  getTodaySession,
  getSessionSummary,
  openSession,
  closeSession,
  reopenSession,
} = require('../controllers/cashSession.controller');

// Both roles can view and open/close sessions
router.get('/', auth, role('owner', 'operator'), getSessions);
router.get('/today', auth, role('owner', 'operator'), getTodaySession);
router.get('/:id/summary', auth, role('owner', 'operator'), getSessionSummary);
router.post('/open', auth, role('owner', 'operator'), openSession);
router.post('/:id/close', auth, role('owner', 'operator'), closeSession);

// Reopen is owner-only (BR-4)
router.post('/:id/reopen', auth, role('owner'), reopenSession);

module.exports = router;
