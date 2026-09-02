const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  login,
  getMe,
  register,
  getUsers,
  updateUser,
} = require('../controllers/auth.controller');

// Public
router.post('/login', login);

// Authenticated
router.get('/me', auth, getMe);

// Owner only
router.post('/register', auth, role('owner'), register);
router.get('/users', auth, role('owner'), getUsers);
router.put('/users/:id', auth, role('owner'), updateUser);

module.exports = router;
