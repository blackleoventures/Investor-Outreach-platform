const Papa = require('papaparse');

// Download Excel template/current data
exports.downloadExcel = async (req, res) => {
  try {
    // Sync latest Firebase data to Excel before download
    await excelService.syncFirebaseToExcel();
    
    const filePath = excelService.getExcelFilePath();
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
      return res.status(400).json({ error: 'No file uploaded' });
    }

    uploadedFilePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const fs = require('fs');
    const { db } = require('../config/firebase-db.config');
    
    console.log(`Processing ${fileExtension} file: ${req.file.originalname}`);
    
    let data = [];
    
    if (fileExtension === 'csv') {
      // Handle CSV file
      const fileContent = fs.readFileSync(uploadedFilePath, 'utf-8');
      
      const { data: csvData, errors } = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });
      
      if (errors.length > 0) {
        console.error('CSV parsing errors:', errors);
        return res.status(400).json({ 
          error: 'Invalid CSV format', 
          details: errors.map(e => e.message).join(', ')
        });
      }
      
      data = csvData;
      
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel file
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(uploadedFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet);
      
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV or Excel files only.' });
    }
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no valid data' });
    }
    
    // Filter out completely empty rows
    const validData = data.filter(item => {
      return Object.values(item).some(value => value && value.toString().trim());
    });
    
    if (validData.length === 0) {
      return res.status(400).json({ error: 'No valid records found. File appears to be empty.' });
    }
    
    // Save to Firebase directly without transformation
    const investorsRef = db.collection('investors');
    
    // Clear existing data in batches
    const snapshot = await investorsRef.get();
    const batchSize = 500;
    
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
        const investorRef = investorsRef.doc();
        batch.set(investorRef, {
          ...item,
          createdAt: new Date(),
          uploadedAt: new Date()
        });
      });
      
      await batch.commit();
    }
    
    // Clean up uploaded file
    try {
      if (fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
    } catch (cleanupError) {
      console.log('File cleanup skipped');
    }
    
    res.status(200).json({
      success: true,
      message: `Successfully imported ${validData.length} records from ${fileExtension.toUpperCase()} file`,
      recordCount: validData.length
    });
    
  } catch (error) {
    console.error('Error in uploadFile:', error);
    
    // Clean up uploaded file on error
    try {
      if (uploadedFilePath && require('fs').existsSync(uploadedFilePath)) {
        require('fs').unlinkSync(uploadedFilePath);
      }
    } catch (cleanupError) {
      console.log('Error cleanup skipped');
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
    await excelService.syncExcelToFirebase();
    res.status(200).json({
      success: true,
      message: 'Excel data synced to Firebase successfully'
    });
  } catch (error) {
    console.error('Error in syncExcelToFirebase:', error);
    res.status(500).json({ error: 'Failed to sync Excel to Firebase' });
  }
};

// Manual sync from Firebase to Excel
exports.syncFirebaseToExcel = async (req, res) => {
  try {
    await excelService.syncFirebaseToExcel();
    res.status(200).json({
      success: true,
      message: 'Firebase data synced to Excel successfully'
    });
  } catch (error) {
    console.error('Error in syncFirebaseToExcel:', error);
    res.status(500).json({ error: 'Failed to sync Firebase to Excel' });
  }
};

// Get sync status
exports.getSyncStatus = async (req, res) => {
  try {
    const excelData = excelService.readExcelData();
    
    res.status(200).json({
      excelRecords: excelData.length,
      isWatching: excelService.isWatching,
      excelPath: excelService.getExcelFilePath()
    });
  } catch (error) {
    console.error('Error in getSyncStatus:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
};