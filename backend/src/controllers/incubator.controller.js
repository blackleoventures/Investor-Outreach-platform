const updateIncubator = async (req, res) => {
  try {
    const updated = await incubatorFileDB.updateIncubator(req.params.id, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteIncubator = async (req, res) => {
  try {
    const result = await incubatorFileDB.deleteIncubator(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const Incubator = require('../models/incubator.model');
const incubatorFileDB = require('../services/incubator-file-db.service');

// Get all incubators
const getAllIncubators = async (req, res) => {
  try {
    // Mirror investor list behavior by reading from local Excel store
    const incubators = await incubatorFileDB.getAllIncubators();
    res.json({ success: true, data: incubators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add single incubator
const addIncubator = async (req, res) => {
  try {
    const created = await incubatorFileDB.addIncubator(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Upload incubators from file
const uploadIncubators = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const originalExtension = req.file.originalname.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(originalExtension)) {
      return res.status(400).json({ success: false, error: 'Only CSV and Excel files are supported' });
    }

    // Store using same file-based approach as investors
    const count = await incubatorFileDB.uploadFile(req.file.path, originalExtension);
    if (count === 0) {
      return res.status(400).json({ success: false, error: 'File is empty or has no valid data' });
    }
    return res.status(201).json({
      success: true,
      message: `${count} incubators uploaded successfully`,
      count,
      recordsProcessed: count,
      fileType: originalExtension,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllIncubators,
  addIncubator,
  uploadIncubators,
  updateIncubator,
  deleteIncubator
};