const express = require('express');
const multer = require('multer');
const path = require('path');
const excelController = require('../controllers/excel.controller');

const router = express.Router();

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/');
  },
  filename: (req, file, cb) => {
    cb(null, `excel-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes
router.get('/download', excelController.downloadExcel);
router.get('/read', excelController.readExcelData);
router.post('/upload', upload.single('excel'), excelController.uploadFile);
router.post('/sync/excel-to-firebase', excelController.syncExcelToFirebase);
router.post('/sync/firebase-to-excel', excelController.syncFirebaseToExcel);
router.get('/sync/status', excelController.getSyncStatus);

module.exports = router;