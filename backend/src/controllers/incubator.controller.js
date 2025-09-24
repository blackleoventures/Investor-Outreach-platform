const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const excelService = require('../services/excel.service');

// Google Sheets config for Incubators
// Default to the same Sheet ID as investors; change if you have a separate Incubators sheet
const SHEET_ID_INCUBATORS = process.env.SHEET_ID_INCUBATORS || process.env.SHEET_ID || '1oyzpOlYhSKRG3snodvPXZxwA2FPnMk2Qok0AMgk2iX0';
const CREDENTIALS_PATH = process.env.EXCEL_JSON_PATH || path.join(__dirname, '../config/excel.json');

const updateIncubator = async (req, res) => {
  res.status(400).json({ 
    success: false,
    error: "Update functionality disabled for Excel-only mode",
    message: "Please update the Excel file and re-upload to make changes"
  });
};

const deleteIncubator = async (req, res) => {
  res.status(400).json({ 
    success: false,
    error: "Delete functionality disabled for Excel-only mode",
    message: "Please update the Excel file and re-upload to make changes"
  });
};

// Try reading incubators from Google Sheets (first worksheet by default)
const getIncubatorsFromGoogleSheet = async () => {
  try {
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID_INCUBATORS, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const data = rows.map(row => {
      const rowData = {};
      sheet.headerValues.forEach(header => {
        rowData[header] = row.get(header) || '';
      });
      return rowData;
    });
    return data;
  } catch (error) {
    console.error('Google Sheets (Incubators) read failed:', error.message);
    return null;
  }
};

// Fallback to local Excel file (incubators.xlsx)
const getIncubatorsFromExcel = () => {
  try {
    return excelService.readExcelData(excelService.incubatorsFilePath);
  } catch (e) {
    return [];
  }
};

// Normalize headers to frontend format
const mapIncubatorRow = (row = {}) => {
  const val = (keys) => keys.find(k => row[k] != null && String(row[k]).toString().trim() !== '') ? row[keys.find(k => row[k] != null && String(row[k]).toString().trim() !== '')] : '';
  const incubatorName = val(['Incubator Name','incubator_name','incubatorName','Organization','Company','Name']);
  const partnerName = val(['Partner Name','partner_name','partnerName','Contact','Contact Name']);
  const partnerEmail = val(['Partner Email','partner_email','partnerEmail','Email','Contact Email']);
  const phoneNumber = val(['Phone number','phone_number','phoneNumber','Phone']);
  const sectorFocus = val(['Sector Focus','sector_focus','sectorFocus','Fund Focus (Sectors)','Focus','Sectors']);
  const country = val(['Country','country']);
  const stateCity = val(['State/City','state_city','stateCity','City','State','Location']);
  return {
    incubatorName,
    partnerName,
    partnerEmail,
    phoneNumber,
    sectorFocus,
    country,
    stateCity,
    ...row
  };
};

// Get all incubators
const getAllIncubators = async (req, res) => {
  try {
    let data = await getIncubatorsFromGoogleSheet();
    let source = 'google_sheets';
    if (!data || data.length === 0) {
      data = getIncubatorsFromExcel();
      source = 'excel_files';
    }

    const mapped = Array.isArray(data) ? data.map(mapIncubatorRow) : [];
    return res.json({ success: true, data: mapped, docs: mapped, totalCount: mapped.length, source });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add single incubator (disabled for Excel-only mode)
const addIncubator = async (req, res) => {
  res.status(400).json({ 
    success: false, 
    error: "Manual addition disabled. Please use Excel file upload instead.",
    message: "Use /api/excel/upload endpoint to add incubators via Excel files"
  });
};

// Redirect to Excel upload endpoint
const uploadIncubators = async (req, res) => {
  res.status(400).json({ 
    success: false,
    error: "Please use /api/excel/upload endpoint for file uploads",
    message: "File upload functionality moved to Excel service"
  });
};

module.exports = {
  getAllIncubators,
  addIncubator,
  uploadIncubators,
  updateIncubator,
  deleteIncubator
};