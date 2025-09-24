const express = require('express');
const router = express.Router();
const sheetsController = require('../controllers/sheets.controller');
const multer = require('multer');
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

// Read data from Google Sheets
router.get('/read', sheetsController.readSheetData);

// Write data to Google Sheets
router.post('/write', sheetsController.writeSheetData);

// Update specific row
router.put('/update-row', sheetsController.updateSheetRow);

// Add new row
router.post('/add-row', sheetsController.addSheetRow);

// Upload Excel to Google Sheet (replace or append)
router.post('/upload-excel', upload.single('file'), sheetsController.uploadExcelToSheet);

module.exports = router;