const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const excelController = require('../controllers/excel.controller');

const router = express.Router();

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use OS temp dir for cross-platform support (Windows/Linux/macOS)
    cb(null, os.tmpdir());
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
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Routes
router.get('/download', excelController.downloadExcel);
router.get('/read', excelController.readExcelData);
// Robust upload route with detailed error logging
router.post('/upload', (req, res, next) => {
  console.log('[excel.upload] incoming request', {
    'content-length': req.headers['content-length'],
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']
  });
  const handler = upload.single('excel');
  handler(req, res, (err) => {
    if (err) {
      console.error('[excel.upload] multer error:', err && (err.stack || err.message || err));
      return res.status(400).json({ error: 'Upload error', details: err.message || String(err), code: err.code || 'MULTER_ERROR' });
    }
    console.log('[excel.upload] multer ok', req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, size: req.file.size, path: req.file.path } : { file: null });
    return excelController.uploadFile(req, res, next);
  });
});
router.post('/sync/excel-to-firebase', excelController.syncExcelToFirebase);
router.post('/sync/firebase-to-excel', excelController.syncFirebaseToExcel);
router.get('/sync/status', excelController.getSyncStatus);

// Lightweight ping route to validate uploads (does not process content)
router.post('/ping', upload.any(), (req, res) => {
  try {
    const info = (req.files || []).map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size }));
    res.json({ ok: true, files: info, count: info.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;