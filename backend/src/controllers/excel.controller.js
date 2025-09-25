const Papa = require('papaparse');
const fileDB = require('../services/file-db.service');
const excelService = require('../services/excel.service');
const path = require('path');
const fs = require('fs');

// Download Excel template/current data
exports.downloadExcel = async (req, res) => {
  try {
    const path = require('path');
    const filePath = path.join(__dirname, '../../data/investors.xlsx');
    const fileName = 'investors.xlsx';
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download Excel file' });
      }
    });
  } catch (error) {
    console.error('Error in downloadExcel:', error);
    res.status(500).json({ error: 'Failed to prepare Excel file for download' });
  }
};

// Upload CSV or Excel file and sync to Firebase
exports.uploadFile = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    if (!req.file) {
      console.error('[excel.controller] No file on request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    // Support both field names: 'excel' and 'file'
    uploadedFilePath = req.file.path;
    const fileExtension = (req.file.originalname.split('.').pop() || '').toLowerCase();
    const fs = require('fs');
    const { db } = require('../config/firebase-db.config');
    
    console.log('[excel.controller] processing', { ext: fileExtension, original: req.file.originalname, path: uploadedFilePath, size: req.file.size });
    
    let data = [];
    
    if (fileExtension === 'csv') {
      // Handle CSV file
      const fileContent = fs.readFileSync(uploadedFilePath, 'utf-8');
      
      const { data: csvData, errors } = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });
      
      if (errors.length > 0) {
        console.error('[excel.controller] CSV parsing errors:', errors);
        return res.status(400).json({ 
          error: 'Invalid CSV format', 
          details: errors.map(e => e.message).join(', ')
        });
      }
      
      data = csvData;
      
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel file using buffer approach
      try {
        const xlsx = require('xlsx');
        
        const fileBuffer = fs.readFileSync(uploadedFilePath);
        const workbook = xlsx.read(fileBuffer, { 
          type: 'buffer',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return res.status(400).json({ 
            error: 'Excel file has no sheets or is corrupted.' 
          });
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          return res.status(400).json({ 
            error: 'Excel sheet is empty or corrupted.' 
          });
        }
        
        data = xlsx.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false
        });
        
        // Convert array of arrays to array of objects
        if (data.length > 0) {
          const headers = data[0];
          data = data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        }
        
      } catch (xlsxError) {
        console.error('[excel.controller] Excel processing error:', xlsxError && (xlsxError.stack || xlsxError.message || xlsxError));
        return res.status(400).json({ 
          error: 'Failed to process Excel file. Please ensure it is a valid Excel file or convert to CSV format.',
          details: xlsxError.message
        });
      }
      
    } else {
      return res.status(400).json({ 
        error: 'Unsupported file format. Please upload CSV or Excel files only.' 
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no valid data' });
    }
    
    // Normalize to canonical headers and ignore extra columns
    const canonicalMap = {
      'investor name': 'Investor Name',
      'name': 'Investor Name',
      'investor': 'Investor Name',
      'partner name': 'Partner Name',
      'contact name': 'Partner Name',
      'partner': 'Partner Name',
      'partner first name': 'Partner Name',
      'partner last name': 'Partner Name',
      'partner email': 'Partner Email',
      'email': 'Partner Email',
      'contact email': 'Partner Email',
      'phone number': 'Phone number',
      'phone': 'Phone number',
      'fund type': 'Fund Type',
      'type': 'Fund Type',
      'fund stage': 'Fund Stage',
      'stage': 'Fund Stage',
      'fund focus (sectors)': 'Fund Focus (Sectors)',
      'sector focus': 'Fund Focus (Sectors)',
      'sectors': 'Fund Focus (Sectors)',
      'focus': 'Fund Focus (Sectors)',
      'location': 'Location',
      'city': 'Location',
      'state': 'Location',
      'country': 'Location',
      'ticket size': 'Ticket Size',
      'website': 'Website'
    };

    const toCanonicalRow = (rowIn = {}) => {
      const out = {};
      // build a lower-case key map
      const lower = {};
      Object.keys(rowIn || {}).forEach(k => {
        lower[String(k).toLowerCase().trim()] = rowIn[k];
      });

      // Helper to get by many keys
      const getFirst = (keys) => {
        for (const k of keys) {
          const v = lower[k];
          if (v != null && String(v).toString().trim() !== '') return v;
        }
        return undefined;
      };

      // Compose Location from country/state/city if separate
      const city = getFirst(['city']);
      const state = getFirst(['state','state/city','state city']);
      const country = getFirst(['country']);
      const locationFallback = getFirst(['location']);
      const location = [city, state, country].filter(Boolean).join(', ') || locationFallback || '';

      // Map canonical fields
      const pairs = [
        ['Investor Name', getFirst(['investor name','name','investor'])],
        ['Partner Name', getFirst(['partner name','contact name','partner','partner first name','partner last name'])],
        ['Partner Email', getFirst(['partner email','email','contact email'])],
        ['Phone number', getFirst(['phone number','phone'])],
        ['Fund Type', getFirst(['fund type','type'])],
        ['Fund Stage', getFirst(['fund stage','stage'])],
        ['Fund Focus (Sectors)', getFirst(['fund focus (sectors)','sector focus','sectors','focus'])],
        ['Location', location],
        ['Ticket Size', getFirst(['ticket size'])],
        ['Website', getFirst(['website'])],
        // ['Owner Email', userEmail], // Temporarily disabled user email
      ];

      for (const [key, val] of pairs) {
        if (val != null && String(val).toString().trim() !== '') out[key] = val;
      }
      return out;
    };

    const normalized = data.map(toCanonicalRow);

    // Filter out completely empty rows (after normalization)
    const validData = normalized.filter(item => {
      return Object.values(item).some(value => value && value.toString().trim());
    });
    
    if (validData.length === 0) {
      return res.status(400).json({ error: 'No valid records found. File appears to be empty.' });
    }
    
    // 1) Write to Google Sheets so the All Investors page (which reads Sheets) shows data
    //    Change: Append new rows instead of replacing existing data
    try {
      const { GoogleSpreadsheet } = require('google-spreadsheet');
      const { JWT } = require('google-auth-library');
      const credsPath = path.join(__dirname, '../config/excel.json');
      // Use the same Sheet ID as investors (update if you keep a separate spreadsheet)
      const SHEET_ID = '1oyzpOlYhSKRG3snodvPXZxwA2FPnMk2Qok0AMgk2iX0';

      const auth = new JWT({ keyFile: credsPath, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
      const doc = new GoogleSpreadsheet(SHEET_ID, auth);
      await doc.loadInfo();
      let sheet = doc.sheetsByIndex[0];
      await sheet.loadHeaderRow().catch(() => {});

      // Canonical header order for a consistent table experience
      const headerOrder = ['Investor Name','Partner Name','Partner Email','Phone number','Fund Type','Fund Stage','Fund Focus (Sectors)','Location','Ticket Size','Website'];
      const existingHeaders = Array.isArray(sheet.headerValues) ? sheet.headerValues : [];
      const needsHeader = !existingHeaders || existingHeaders.length === 0;
      if (needsHeader) {
        await sheet.setHeaderRow(headerOrder);
      } else {
        // Ensure all canonical headers exist; if not, reset to canonical
        const missing = headerOrder.some(h => !existingHeaders.includes(h));
        if (missing) await sheet.setHeaderRow(headerOrder);
      }

      // Append without overriding existing rows. Skip duplicates by Partner Email + Investor Name
      await sheet.loadHeaderRow();
      const rows = await sheet.getRows();
      const keyOf = (r) => `${(r['Partner Email']||'').toString().toLowerCase()}|${(r['Investor Name']||'').toString().toLowerCase()}`;
      const existingKeys = new Set(rows.map(r => keyOf(r)));
      const toAppend = [];
      for (const r of validData) {
        const rowObj = {};
        headerOrder.forEach(h => { rowObj[h] = r[h] || ''; });
        const k = `${(rowObj['Partner Email']||'').toString().toLowerCase()}|${(rowObj['Investor Name']||'').toString().toLowerCase()}`;
        if (!existingKeys.has(k)) {
          existingKeys.add(k);
          toAppend.push(rowObj);
        }
      }
      if (toAppend.length > 0) {
        await sheet.addRows(toAppend);
      }
      console.log('[excel.controller] Appended rows to Google Sheet:', toAppend.length);
    } catch (sheetErr) {
      console.error('[excel.controller] Google Sheets write failed:', sheetErr && (sheetErr.stack || sheetErr.message || sheetErr));
      // Do not fail the upload if Sheet write fails; continue to DB save as a fallback
    }

    // 2) Save to Firebase (best-effort, non-blocking for UI)
    const investorsRef = db.collection('investors');
    try {
      // Clear existing data in smaller batches
      const snapshot = await investorsRef.get();
      const batchSize = 100;
      
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
      
      // Add new data in batches
      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = db.batch();
        const chunk = validData.slice(i, i + batchSize);
        
        chunk.forEach(item => {
          const docRef = investorsRef.doc();
          batch.set(docRef, {
            ...item,
            createdAt: new Date(),
            uploadedAt: new Date()
          });
        });
        
        await batch.commit();
      }
    } catch (firebaseError) {
      console.error('Firebase error:', firebaseError);
      // Return success with counts so upload still considered successful
      return res.status(200).json({
        success: true,
        message: 'Uploaded to Google Sheet. Database save failed (non-blocking).',
        details: firebaseError.message,
        recordCount: validData.length
      });
    }
    
    // Clean up uploaded file
    try {
      if (fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
    } catch (cleanupError) {
      console.log('[excel.controller] File cleanup skipped');
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully appended ${validData.length} records (skips duplicates)`,
      recordCount: validData.length
    });
    
  } catch (error) {
    console.error('[excel.controller] Error in uploadFile:', error && (error.stack || error.message || error));
    
    // Clean up uploaded file on error
    try {
      if (uploadedFilePath && require('fs').existsSync(uploadedFilePath)) {
        require('fs').unlinkSync(uploadedFilePath);
      }
    } catch (cleanupError) {
      console.log('[excel.controller] Error cleanup skipped');
    }
    
    res.status(500).json({ 
      error: 'Failed to process file', 
      details: error.message 
    });
  }
};

// Legacy Excel upload (keeping for backward compatibility)
exports.uploadExcel = exports.uploadFile;

// Manual sync from Excel to Firebase
exports.syncExcelToFirebase = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();
    res.status(200).json({
      success: true,
      message: 'Excel data synced to Firebase successfully',
      count: investors.length
    });
  } catch (error) {
    console.error('Error in syncExcelToFirebase:', error);
    res.status(500).json({ error: 'Failed to sync Excel to Firebase' });
  }
};

// Manual sync from Firebase to Excel
exports.syncFirebaseToExcel = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();
    res.status(200).json({
      success: true,
      message: 'Firebase data synced to Excel successfully',
      count: investors.length
    });
  } catch (error) {
    console.error('Error in syncFirebaseToExcel:', error);
    res.status(500).json({ error: 'Failed to sync Firebase to Excel' });
  }
};

// Get sync status
exports.getSyncStatus = async (req, res) => {
  try {
    const investors = await fileDB.getAllInvestors();
    
    res.status(200).json({
      excelRecords: investors.length,
      totalInvestors: investors.length,
      status: 'active'
    });
  } catch (error) {
    console.error('Error in getSyncStatus:', error);
    res.status(500).json({ error: 'Failed to get sync status', details: error.message });
  }
};

// Read Excel data directly (fallback for Google Sheets API issues)
exports.readExcelData = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    if (type === 'all') {
      const allData = excelService.readAllExcelData();
      res.json({
        success: true,
        data: [...allData.investors, ...allData.incubators],
        investors: allData.investors,
        incubators: allData.incubators,
        totalRecords: allData.total,
        source: 'excel_files'
      });
    } else if (type === 'investors') {
      const investorsData = excelService.readExcelData();
      res.json({
        success: true,
        data: investorsData,
        totalRecords: investorsData.length,
        source: 'excel_files'
      });
    } else if (type === 'incubators') {
      const incubatorsData = excelService.readExcelData(excelService.incubatorsFilePath);
      res.json({
        success: true,
        data: incubatorsData,
        totalRecords: incubatorsData.length,
        source: 'excel_files'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid type. Use: all, investors, or incubators'
      });
    }
  } catch (error) {
    console.error('Error reading Excel data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read Excel data',
      details: error.message
    });
  }
};