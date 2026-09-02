const Unit = require('../models/Unit');

exports.getUnits = async (req, res, next) => {
  try {
    const units = await Unit.find().sort({ name: 1 });
    res.json({ success: true, data: units });
  } catch (error) {
    next(error);
  }
};

exports.getUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    res.json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

exports.createUnit = async (req, res, next) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Unit name must be unique' });
    }
    next(error);
  }
};

exports.updateUnit = async (req, res, next) => {
  try {
    const { name, capacity, status } = req.body;
    
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    if (capacity !== undefined && capacity < unit.currentStock) {
      return res.status(400).json({ success: false, message: 'Capacity cannot be reduced below current stock' });
    }

    if (name) unit.name = name;
    if (capacity !== undefined) unit.capacity = capacity;
    if (status) unit.status = status;

    await unit.save();

    res.json({ success: true, data: unit });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Unit name must be unique' });
    }
    next(error);
  }
};

exports.deleteUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    if (unit.status === 'inactive') {
      return res.status(400).json({ success: false, message: 'Unit is already inactive' });
    }

    unit.status = 'inactive';
    await unit.save();

    res.json({ success: true, data: unit, message: 'Unit deactivated successfully' });
  } catch (error) {
    next(error);
  }
};
