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
const getIncubatorsFromGoogleSheet = async (userEmail = null) => {
  try {
    console.log('Trying to read from Google Sheets ID:', SHEET_ID_INCUBATORS);
    const serviceAccountAuth = new JWT({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID_INCUBATORS, serviceAccountAuth);
    await doc.loadInfo();
    console.log('Sheet title:', doc.title);
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    console.log('Headers:', sheet.headerValues);
    const rows = await sheet.getRows();
    console.log('Total rows found:', rows.length);

    const data = rows.map(row => {
      const rowData = {};
      sheet.headerValues.forEach(header => {
        rowData[header] = row.get(header) || '';
      });
      return rowData;
    });
    
    console.log('Sample data:', data.slice(0, 2));
    // Return all data from Google Sheets (no filtering for now)
    return data;
  } catch (error) {
    console.error('Google Sheets (Incubators) read failed:', error.message);
    return null;
  }
};

// Fallback to local Excel file (incubators.xlsx)
const getIncubatorsFromExcel = (userEmail = null) => {
  try {
    const data = excelService.readExcelData(excelService.incubatorsFilePath);
    
    // Return all data (no filtering for now)
    // if (userEmail && Array.isArray(data)) {
    //   const filtered = data.filter(row => {
    //     const ownerEmail = row['Owner Email'] || row['owner_email'] || row['User Email'] || row['user_email'] || '';
    //     return ownerEmail.toLowerCase() === userEmail.toLowerCase();
    //   });
    //   return filtered.length > 0 ? filtered : data;
    // }
    
    return data;
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
    console.log('getAllIncubators called');
    const userEmail = req.user?.email || null;
    
    let data = [];
    let source = 'none';
    
    try {
      data = await getIncubatorsFromGoogleSheet(userEmail);
      source = 'google_sheets';
      console.log('Google Sheets data loaded:', data?.length || 0);
    } catch (sheetError) {
      console.log('Google Sheets failed, trying Excel:', sheetError.message);
      try {
        data = getIncubatorsFromExcel(userEmail);
        source = 'excel_files';
        console.log('Excel data loaded:', data?.length || 0);
      } catch (excelError) {
        console.log('Excel also failed:', excelError.message);
        data = [];
        source = 'fallback';
      }
    }

    const mapped = Array.isArray(data) ? data.map(mapIncubatorRow) : [];
    console.log('Returning response with', mapped.length, 'records');
    return res.status(200).json({ 
      success: true, 
      data: mapped, 
      docs: mapped, 
      totalCount: mapped.length, 
      source 
    });
  } catch (error) {
    console.error('getAllIncubators error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message,
      data: [],
      docs: [],
      totalCount: 0
    });
  }
};

// Add single incubator
const addIncubator = async (req, res) => {
  try {
    const incubatorData = req.body;
    
    // Validate required fields
    if (!incubatorData.name) {
      return res.status(400).json({ 
        success: false, 
        error: "Incubator name is required" 
      });
    }

    console.log(`📝 Adding incubator manually: ${incubatorData.name}`);

    // Add incubator to Excel file via excelService
    await excelService.addIncubator(incubatorData);
    
    console.log(`✅ Added incubator: ${incubatorData.name}`);

    res.json({
      success: true,
      message: `Incubator '${incubatorData.name}' added successfully`,
      data: incubatorData
    });

  } catch (error) {
    console.error('❌ Add incubator error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
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