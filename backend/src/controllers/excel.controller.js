const excelService = require('../services/excel.service');
const path = require('path');
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
    
    console.log(`Processing ${fileExtension} file: ${req.file.originalname}`);
    
    // Validate file exists
    if (!fs.existsSync(uploadedFilePath)) {
      return res.status(400).json({ error: 'Uploaded file not found' });
    }
    
    let recordCount = 0;
    
    if (fileExtension === 'csv') {
      // Handle CSV file
      const fileContent = fs.readFileSync(uploadedFilePath, 'utf-8');
      
      const { data, errors } = Papa.parse(fileContent, {
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
      
      if (!data || data.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or has no valid data' });
      }
      
      recordCount = data.length;
      await excelService.writeExcelData(data);
      
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel file
      const targetPath = excelService.getExcelFilePath();
      
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.copyFileSync(uploadedFilePath, targetPath);
      
      // Read Excel data to get record count
      const excelData = excelService.readExcelData();
      recordCount = excelData.length;
      
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV or Excel files only.' });
    }
    
    // Clean up uploaded file
    if (fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    
    // Sync to Firebase
    console.log('Syncing to Firebase...');
    await excelService.syncExcelToFirebase();
    
    res.status(200).json({
      success: true,
      message: `Successfully imported ${recordCount} records from ${fileExtension.toUpperCase()} file`,
      recordCount: recordCount
    });
    
  } catch (error) {
    console.error('Error in uploadFile:', error);
    
    // Clean up uploaded file on error
    if (uploadedFilePath && require('fs').existsSync(uploadedFilePath)) {
      try {
        require('fs').unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
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