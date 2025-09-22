const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require('fs');

// Google Sheets configuration
const SHEET_ID = '1hKxsYnsvEWo3qGJuy8KGdW3yW_M4EFsG';
const CREDENTIALS_PATH = path.join(__dirname, '../config/excel.json');

// Initialize Google Sheets client with fallback
const initializeSheet = async () => {
  try {
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
    if (error.message.includes('403') || error.message.includes('API has not been used')) {
      console.log('Google Sheets API not enabled. Please enable it at: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=690546504866');
    }
    throw error;
  }
};

// Fallback to Excel file reading
const readExcelFallback = async (filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    
    const data = [];
    const headers = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => {
          headers.push(cell.value);
        });
      } else {
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          if (headers[colNumber - 1]) {
            rowData[headers[colNumber - 1]] = cell.value;
          }
        });
        data.push(rowData);
      }
    });
    
    return { data, headers };
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return { data: [], headers: [] };
  }
};

// Read data from Google Sheets with Excel fallback
exports.readSheetData = async (req, res) => {
  try {
    const doc = await initializeSheet();
    const sheet = doc.sheetsByIndex[0]; // First sheet
    
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    
    const data = rows.map(row => {
      const rowData = {};
      sheet.headerValues.forEach(header => {
        rowData[header] = row.get(header) || '';
      });
      return rowData;
    });

    res.json({
      success: true,
      data: data,
      headers: sheet.headerValues,
      totalRows: rows.length
    });
  } catch (error) {
    console.error('Error reading sheet data:', error);
    
    // Fallback to Excel files
    if (error.message.includes('403') || error.message.includes('API has not been used')) {
      console.log('Falling back to Excel files...');
      const investorsPath = path.join(__dirname, '../../data/investors.xlsx');
      const incubatorsPath = path.join(__dirname, '../../data/incubators.xlsx');
      
      try {
        const investorsData = await readExcelFallback(investorsPath);
        const incubatorsData = await readExcelFallback(incubatorsPath);
        
        res.json({
          success: true,
          data: [...investorsData.data, ...incubatorsData.data],
          headers: investorsData.headers.length > 0 ? investorsData.headers : incubatorsData.headers,
          totalRows: investorsData.data.length + incubatorsData.data.length,
          source: 'excel_fallback'
        });
        return;
      } catch (fallbackError) {
        console.error('Excel fallback also failed:', fallbackError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Write data to Google Sheets
exports.writeSheetData = async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required'
      });
    }

    const doc = await initializeSheet();
    const sheet = doc.sheetsByIndex[0];
    
    // Clear existing data (except headers)
    await sheet.clear('A2:Z');
    
    // Add new data
    if (data.length > 0) {
      await sheet.addRows(data);
    }

    res.json({
      success: true,
      message: `Updated ${data.length} rows successfully`
    });
  } catch (error) {
    console.error('Error writing sheet data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update specific row
exports.updateSheetRow = async (req, res) => {
  try {
    const { rowIndex, data } = req.body;
    
    const doc = await initializeSheet();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    if (rowIndex >= 0 && rowIndex < rows.length) {
      const row = rows[rowIndex];
      Object.keys(data).forEach(key => {
        row.set(key, data[key]);
      });
      await row.save();
      
      res.json({
        success: true,
        message: 'Row updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid row index'
      });
    }
  } catch (error) {
    console.error('Error updating sheet row:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add new row
exports.addSheetRow = async (req, res) => {
  try {
    const { data } = req.body;
    
    const doc = await initializeSheet();
    const sheet = doc.sheetsByIndex[0];
    
    await sheet.addRow(data);
    
    res.json({
      success: true,
      message: 'Row added successfully'
    });
  } catch (error) {
    console.error('Error adding sheet row:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};