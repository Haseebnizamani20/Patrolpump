const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/units.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.route('/')
  .get(auth, role('owner', 'operator'), unitsController.getUnits)
  .post(auth, role('owner'), unitsController.createUnit);

router.route('/:id')
  .get(auth, role('owner', 'operator'), unitsController.getUnit)
  .put(auth, role('owner'), unitsController.updateUnit)
  .delete(auth, role('owner'), unitsController.deleteUnit);

module.exports = router;
