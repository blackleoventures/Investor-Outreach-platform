const express = require('express');
const router = express.Router();
const sheetsController = require('../controllers/sheets.controller');

// Read data from Google Sheets
router.get('/read', sheetsController.readSheetData);

// Write data to Google Sheets
router.post('/write', sheetsController.writeSheetData);

// Update specific row
router.put('/update-row', sheetsController.updateSheetRow);

// Add new row
router.post('/add-row', sheetsController.addSheetRow);

module.exports = router;